import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import pc from "picocolors";
import OpenAI from "openai"; // Keep this for getApiKey, if still needed for HttpBackend directly
import { loadConfig } from './core/config.js'; // Import loadConfig
import { PreToolUseHook } from './hooks/morphApply.js'; // Import PreToolUseHook

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

  const config = loadConfig();
  const account = config.account;

  if (!account) {
    console.error(pc.red("[morph] Account not configured. Run `morph-hook install` first."));
    process.exit(1);
  }

  const preToolUseHook = new PreToolUseHook(account);

  const handled = await preToolUseHook.onPreToolUse(toolName, toolInput, toolResp);

  if (handled) {
    // If the hook handled the tool call, exit successfully
    process.exit(0);
  } else {
    // If the hook did not handle the tool call, exit with an error
    // to signal Claude to proceed with its original tool execution.
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(pc.red(`[morph] Unexpected error: ${String(e)}`));
  process.exit(1);
});
