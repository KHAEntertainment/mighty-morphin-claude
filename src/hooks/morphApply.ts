import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import pc from "picocolors";
import OpenAI from "openai";

async function getApiKey(): Promise<string | undefined> {
  if (process.env.MORPH_LLM_API_KEY) return process.env.MORPH_LLM_API_KEY;
  try {
    const keytar = await import("keytar");
    const os = await import("node:os");
    const user = os.userInfo().username;
    return await keytar.default.getPassword("morphllm", user) ?? undefined;
  } catch {
    return undefined;
  }
}

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

function extractBetween(text: string, startTag = "<merged>", endTag = "</merged>") {
  const s = text.indexOf(startTag);
  const e = text.indexOf(endTag);
  if (s >= 0 && e > s) return text.slice(s + startTag.length, e).trim();
  return text.trim();
}

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
