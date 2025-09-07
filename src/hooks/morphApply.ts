import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import pc from "picocolors";
import OpenAI from "openai";

/**
 * Retrieves the Morph LLM API key if available.
 *
 * First returns the value of the MORPH_LLM_API_KEY environment variable if set.
 * If not present, attempts to dynamically import the system keyring (keytar) and
 * the OS module to look up a stored password for service "morphllm" under the
 * current OS username. Returns the found key or `undefined` if none is available
 * or if any lookup/import error occurs.
 */
async function getApiKey(): Promise<string | undefined> {
  if (process.env.MORPH_LLM_API_KEY) return process.env.MORPH_LLM_API_KEY;
  if (process.env.MORPH_API_KEY)     return process.env.MORPH_API_KEY;
  try {
    const keytar = await import("keytar");
    const os = await import("node:os");
    const user = os.userInfo().username;
    return await keytar.default.getPassword("morphllm", user) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads all data from standard input and returns it as a UTF-8 string.
 *
 * The returned promise resolves with the full accumulated stdin content when the stream ends,
 * and rejects if the stdin stream emits an "error".
 *
 * @returns A promise that resolves to the complete stdin content as a string.
 */
async function readStdin(): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = "";
    try {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data));
      process.stdin.on("error", reject);
    } catch (e) { reject(e); }
  });
}

/**
 * Extracts and returns the substring found between two tag markers.
 *
 * If both `startTag` and `endTag` are present in `text` and `endTag` occurs after `startTag`,
 * the function returns the trimmed text between them. Otherwise it returns `text.trim()`.
 *
 * @param text - The input string to search.
 * @param startTag - Opening marker to locate the start of the extracted region (default: `"<merged>"`).
 * @param endTag - Closing marker to locate the end of the extracted region (default: `"</merged>"`).
 * @returns The trimmed content between the tags, or the trimmed original `text` if tags are not found in order.
 */
function extractBetween(text: string, startTag = "<merged>", endTag = "</merged>") {
  const s = text.indexOf(startTag);
  const e = text.indexOf(endTag);
  if (s >= 0 && e > s) return text.slice(s + startTag.length, e).trim();
  return text.trim();
}

/**
 * Read hook input from stdin, merge provided update into a target file using Morph LLM, and write the merged result back to disk.
 *
 * The function:
 * - Parses JSON from stdin to locate a target file path (from `tool_response.filePath` or `tool_input.file_path`) and an update payload (`tool_input.content`).
 * - Reads the existing file contents, calls the Morph API (model `morph-v3-large`) to merge the `<update>` into the `<code>`, and expects the model to return the merged file wrapped in `<merged>` tags.
 * - Extracts the merged content and overwrites the target file with it.
 *
 * Side effects:
 * - Reads stdin and the target file from disk.
 * - Writes the merged content to the target file.
 * - Exits the process with codes:
 *   - 0 for success or benign skips (missing input/file_path/content),
 *   - 1 for errors (JSON parse failure, file read/write failures, missing API key, empty API response, or API/processing errors).
 *
 * Behavior notes:
 * - If no stdin input or required fields are missing, the function logs a message and exits with code 0 (no-op).
 * - If the Morph API response is empty or the merge fails, the function logs an error and exits with code 1.
 */
async function main() {
  const raw = await readStdin();
  if (!raw?.trim()) {
    console.error(pc.yellow("[morph] No hook input on stdin; skipping."));
    process.exit(0);
  }

  let input: any;
  try { input = JSON.parse(raw); }
  catch (e) {
    console.error(pc.red(`[morph] Failed to parse hook input JSON: ${String(e)}`));
    process.exit(1);
  }

  const toolName: string = input?.tool_name ?? "";
  const toolInput = input?.tool_input ?? {};
  const toolResp = input?.tool_response ?? {};

  const filePath: string | undefined = toolResp?.filePath || toolInput?.file_path;
  const content: string | undefined = toolInput?.content;

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
  try { original = readFileSync(filePath, "utf8"); } 
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

  const userMessage = 
    `<instruction>${instruction}</instruction>
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
    if (!txt) throw new Error("Empty response from Morph Apply");

    const merged = extractBetween(txt, "<merged>", "</merged>");
    if (!merged || merged.trim().length < 10) {
      throw new Error("Refusing to overwrite with empty/near-empty merge.");
    }
    await fs.writeFile(filePath, merged, "utf8");
    console.log(pc.green(`[morph] Applied merge to ${path.relative(process.cwd(), filePath)}`));
    process.exit(0);
  } catch (e: any) {
    console.error(pc.red(`[morph] Apply failed: ${e?.message ?? String(e)}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(pc.red(`[morph] Unexpected error: ${String(e)}`));
  process.exit(1);
});
