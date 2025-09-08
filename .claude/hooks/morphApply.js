import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import pc from "picocolors";
import OpenAI from "openai";
/**
 * Retrieve the Morph API key from the environment or the OS keychain.
 *
 * Attempts to return the value of MORPH_LLM_API_KEY if set; otherwise tries to
 * load the system keychain via `keytar` and returns the stored password for the
 * "morphllm" service and the current OS user. Returns `undefined` if no key is
 * found or if keychain access/import fails.
 *
 * @return {Promise<string|undefined>} The API key string, or `undefined` when not available.
 */
async function getApiKey() {
    if (process.env.MORPH_LLM_API_KEY) return process.env.MORPH_LLM_API_KEY;
    if (process.env.MORPH_API_KEY) return process.env.MORPH_API_KEY;
    try {
        const keytar = await import("keytar");
        const os = await import("node:os");
        const user = os.userInfo().username;
        return (await keytar.default.getPassword("morphllm", user)) ?? undefined;
    } catch {
        return undefined;
    }
}
/**
 * Read all data from standard input and return it as a UTF-8 string.
 *
 * Resolves with the complete concatenated stdin content once the stream ends.
 * Rejects if the stdin stream emits an error or if an exception occurs while setting up listeners.
 *
 * @return {Promise<string>} Promise that resolves to the full stdin content.
 */
async function readStdin() {
    return await new Promise((resolve, reject) => {
        let data = "";
        try {
            process.stdin.setEncoding("utf8");
            process.stdin.on("data", (chunk) => (data += chunk));
            process.stdin.on("end", () => resolve(data));
            process.stdin.on("error", reject);
        }
        catch (e) {
            reject(e);
        }
    });
}
/**
 * Extracts and returns the substring located between two tag markers in the given text.
 *
 * If both startTag and endTag are found and endTag occurs after startTag, returns the trimmed content between them.
 * Otherwise returns the entire input text trimmed.
 *
 * @param {string} text - Input string to search.
 * @param {string} [startTag="<merged>"] - Opening tag to locate the start of the extraction.
 * @param {string} [endTag="</merged>"] - Closing tag to locate the end of the extraction.
 * @return {string} The trimmed extracted content, or the trimmed original text if tags are not found in order.
 */
function extractBetween(text, startTag = "<merged>", endTag = "</merged>") {
    const s = text.indexOf(startTag);
    const e = text.indexOf(endTag, s + startTag.length);
    if (s >= 0 && e > s)
        return text.slice(s + startTag.length, e).trim();
    return text.trim();
}
/**
 * Orchestrates the Morph "apply" hook: reads hook JSON from stdin, requests a merge from Morph, and writes the merged file back.
 *
 * This function:
 * - Reads JSON input from stdin and extracts tool_name, tool_input, and tool_response.
 * - Resolves the target file path (from tool_response.filePath or tool_input.file_path) and the update content (tool_input.content).
 * - If the path or content is missing, logs a skip message and exits with code 0.
 * - Reads the original file contents from disk.
 * - Obtains an API key via getApiKey() (or from MORPH_LLM_API_KEY) and calls Morph's chat/completions API (model "morph-v3-large") with a prompt that asks for the merged file wrapped in <merged>...</merged>.
 * - Extracts the merged content from the API response and overwrites the target file with it.
 * - Logs success and exits with code 0, or logs an error and exits with code 1 on failures.
 *
 * Side effects:
 * - Reads stdin.
 * - Reads and writes files on disk.
 * - Calls external network API (Morph via OpenAI client).
 * - Terminates the process (calls process.exit with 0 or 1).
 */
async function main() {
    const raw = await readStdin();
    if (!raw?.trim()) {
        console.error(pc.yellow("[morph] No hook input on stdin; skipping."));
        process.exit(0);
    }
    let input;
    try {
        input = JSON.parse(raw);
    }
    catch (e) {
        console.error(pc.red(`[morph] Failed to parse hook input JSON: ${String(e)}`));
        process.exit(1);
    }
    const toolName = input?.tool_name ?? "";
    const toolInput = input?.tool_input ?? {};
    const toolResp = input?.tool_response ?? {};
    const filePath = toolResp?.filePath || toolInput?.file_path;
    const content = toolInput?.content;
    if (!filePath || typeof filePath !== "string") {
        console.error(pc.yellow("[morph] No file_path resolved from hook; skipping."));
        process.exit(0);
    }
    if (!content || typeof content !== "string") {
        console.log(pc.gray(`[morph] ${toolName}: no content in hook; skipping ${filePath}`));
        process.exit(0);
    }
    const abs = path.resolve(String(filePath));
    const root = process.cwd() + path.sep;
    if (!abs.startsWith(root)) {
        console.error(pc.red(`[morph] Refusing to write outside workspace: ${abs}`));
        process.exit(1);
    }
    let original = "";
    try {
        original = readFileSync(filePath, "utf8");
    }
    catch (e) {
        console.error(pc.red(`[morph] Failed reading ${filePath}: ${String(e)}`));
        process.exit(1);
    }
    const key = await getApiKey();
    if (!key) {
        console.error(pc.red("[morph] Missing MORPH_LLM_API_KEY. Set env or store via installer."));
        process.exit(1);
    }
    const client = new OpenAI({ apiKey: key, baseURL: "https://api.morphllm.com/v1" });
    const instruction = [
        "Merge the <update> into <code> to produce a complete, compilable file.",
        "Preserve formatting, imports, identifiers, comments, and surrounding structure.",
        "DO NOT add explanations. Respond ONLY with the merged file content wrapped in <merged> tags."
    ].join(" ");
    const userMessage = `<instruction>${instruction}</instruction>
` +
        `<code>${original}</code>
` +
        `<update>${content}</update>`;
    try {
        const resp = await client.chat.completions.create({
            model: "morph-v3-large",
            messages: [{ role: "user", content: userMessage }],
            temperature: 0,
            top_p: 1
        }, { timeout: 60_000 });
        const txt = resp.choices?.[0]?.message?.content ?? "";
        if (!txt)
            throw new Error("Empty response from Morph Apply");
        const merged = extractBetween(txt, "<merged>", "</merged>");
        if (!merged || merged.trim() === "") {
            console.warn(pc.yellow(`[morph] Warning: Empty merged content for ${path.relative(process.cwd(), filePath)}. Original file preserved.`));
            process.exit(0); // Exit with 0 to indicate non-blocking success, as per user's preference for "skip writing and exit 0"
        } else {
            await fs.writeFile(filePath, merged, "utf8");
            console.log(pc.green(`[morph] Applied merge to ${path.relative(process.cwd(), filePath)}`));
            process.exit(0);
        }
    }
    catch (e) {
        console.error(pc.red(`[morph] Apply failed: ${e?.message ?? String(e)}`));
        process.exit(1);
    }
}
main().catch((e) => {
    console.error(pc.red(`[morph] Unexpected error: ${String(e)}`));
    process.exit(1);
});
