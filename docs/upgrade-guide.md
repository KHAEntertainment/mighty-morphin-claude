# CODEx IMPLEMENTATION PROMPT — Claude-Code Hooks + Slash Command + Subagent (Global/Project Installer)

Goal: Convert the repo to a Claude-Code–native Morph Fast-Apply integration that runs automatically after code edits (no MCP/tool approvals), and also exposes a manual /morph-apply command plus a proactive subagent. Provide an interactive installer that offers:
- Project install → writes to .claude/ in this repo
- Global install → writes to ~/.claude/
- Both

Assume the environment already provides MORPH_LLM_API_KEY in Codex. If it’s not set, prompt once and optionally store securely via keytar. Use $CLAUDE_PROJECT_DIR in hooks so scripts resolve in the project tree.

----------------------------------------------------------------
0) Dependencies & Project Setup
----------------------------------------------------------------
Add/ensure the following in package.json:
(type = "module"; adjust as needed)

{
  "type": "module",
  "scripts": {
    "build": "tsc -p .",
    "setup:claude": "node dist/scripts/setupClaude.js",
    "postinstall": "node dist/scripts/setupClaude.js --noninteractive || true",
    "test:hook": "bash scripts/smokeHook.sh"
  },
  "dependencies": {
    "openai": "^4.56.0",
    "fs-extra": "^11.2.0",
    "picocolors": "^1.0.0",
    "keytar": "^8.3.0"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "tsx": "^4.19.0"
  }
}

Ensure tsconfig.json compiles src/**/* to dist (outDir: "dist").

Create folders:
- src/hooks/
- src/scripts/
- scripts/ (for bash smoke test)

----------------------------------------------------------------
1) Hook Runner — src/hooks/morphApply.ts
----------------------------------------------------------------
Create a Node script that reads hook input JSON from STDIN and calls Morph Fast-Apply (OpenAI-compatible) to merge edits. Behavior:

- Parse STDIN JSON. Expected keys:
  - hook_event_name, tool_name
  - tool_input.file_path and tool_input.content (PostToolUse/PreToolUse)
  - optionally tool_response.filePath
- targetPath = tool_response.filePath || tool_input.file_path
- Read current file contents from disk as original
- update = tool_input.content (if absent, skip)
- Compose instruction requesting a merged file with structure preserved
- Call Morph with baseURL = "https://api.morphllm.com/v1" and model = "morph-v3-large"
- Ask Morph to return only merged code inside <merged>...</merged>
- Extract merged content, overwrite targetPath
- Log succinct result; on error, write to stderr and exit non-zero

FILE: src/hooks/morphApply.ts
(typescript)

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
    `<instruction>${instruction}</instruction>\n` +
    `<code>${original}</code>\n` +
    `<update>${content}</update>`;

  try {
    const resp = await client.chat.completions.create({
      model: "morph-v3-large",
      messages: [{ role: "user", content: userMessage }]
    });
    const txt = resp.choices?.[0]?.message?.content ?? "";
    if (!txt) throw new Error("Empty response from Morph Apply");

    const merged = extractBetween(txt, "<merged>", "</merged>");
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

----------------------------------------------------------------
2) Project Hook Config — .claude/settings.json
----------------------------------------------------------------
Create or deep-merge the following (use $CLAUDE_PROJECT_DIR so the hook finds the built script within the project):

{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/dist/hooks/morphApply.js",
            "timeout": 60
          }
        ]
      }
    ]
  }
}

If .claude/settings.json already exists, deep-merge hooks.PostToolUse by command string and dedupe.

----------------------------------------------------------------
3) Global Hook Config — ~/.claude/settings.json (if chosen)
----------------------------------------------------------------
Copy dist/hooks/morphApply.js to ~/.claude/hooks/morphApply.js, then deep-merge:

{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/morphApply.js",
            "timeout": 60
          }
        ]
      }
    ]
  }
}

----------------------------------------------------------------
4) Slash Command — .claude/commands/morph-apply.md
----------------------------------------------------------------
Create a project command for manual usage (and global variant if chosen):

---
argument-hint: [description] [file_path]
description: Apply Morph Fast-Apply to merge a described change into a file.
allowed-tools: Bash(node:*)
---

## Context
- Current git status: !`git status -s`

## Your task
Use Morph Fast-Apply to merge the described change into the target file.

Description: $1
File: $2

----------------------------------------------------------------
5) Subagent — .claude/agents/morph-agent.md
----------------------------------------------------------------
Create a proactive subagent that nudges Morph usage right after edits (and global variant if chosen):

---
name: morph-agent
description: PROACTIVELY use for structural edits. After any Edit/Write/MultiEdit, call /morph-apply with a succinct description and target file.
tools: Edit, Write, MultiEdit, Bash
---

You are a specialist for reliable merges. When you produce code edits that should be merged safely,
immediately trigger `/morph-apply "<short description>" <file_path>` so Morph performs the merge.
Keep diffs surgical; preserve imports, identifiers, formatting, and comments.

----------------------------------------------------------------
6) Interactive Installer — src/scripts/setupClaude.ts
----------------------------------------------------------------
Create an installer that:
- Prompts: Project, Global (~/.claude), or Both
- Ensures directories for chosen scopes exist
- Builds the project if dist is missing
- Writes/merges hook JSON
- Copies dist/hooks/morphApply.js to scope hooks dir(s)
- Writes morph-apply.md and morph-agent.md if missing
- If MORPH_LLM_API_KEY absent, offer to store with keytar under service morphllm (account = OS username)
- Supports --noninteractive (default Project) and --uninstall (best-effort clean)

FILE: src/scripts/setupClaude.ts
(typescript)

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import pc from "picocolors";

type Scope = "project" | "global" | "both";

const PROJECT_CLAUDE = path.resolve(".claude");
const GLOBAL_CLAUDE = path.join(os.homedir(), ".claude");

async function promptScope(): Promise<Scope> {
  if (process.argv.includes("--noninteractive")) return "project";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(
    "Install Morph Claude-Code integration to: [1] Project (.claude), [2] Global (~/.claude), [3] Both? "
  )).trim();
  rl.close();
  if (ans === "2") return "global";
  if (ans === "3") return "both";
  return "project";
}

async function ensureDir(p: string) { await fsp.mkdir(p, { recursive: true }); }
function exists(p: string) { try { fs.accessSync(p); return true; } catch { return false; } }

async function deepMergeSettings(destPath: string, add: any) {
  let base: any = {};
  if (exists(destPath)) {
    try { base = JSON.parse(await fsp.readFile(destPath, "utf8")); }
    catch { base = {}; }
  }
  base.hooks ??= {};
  base.hooks.PostToolUse ??= [];

  const incoming = add?.hooks?.PostToolUse ?? [];
  const key = (h: any) => JSON.stringify(h?.hooks ?? []) + (h?.matcher ?? "");
  const current = new Map<string, any>(base.hooks.PostToolUse.map((h: any) => [key(h), h]));
  for (const h of incoming) current.set(key(h), h);

  base.hooks.PostToolUse = Array.from(current.values());
  await ensureDir(path.dirname(destPath));
  await fsp.writeFile(destPath, JSON.stringify(base, null, 2), "utf8");
}

async function writeIfMissing(p: string, content: string) {
  if (exists(p)) return;
  await ensureDir(path.dirname(p));
  await fsp.writeFile(p, content, "utf8");
}

async function main() {
  if (process.argv.includes("--uninstall")) {
    console.log(pc.yellow("Uninstall not implemented in this minimal script."));
    process.exit(0);
  }

  const hookDist = path.resolve("dist/hooks/morphApply.js");
  if (!exists(hookDist)) {
    console.log(pc.cian ? pc.cian("Building project...") : "Building project...");
    const { spawnSync } = await import("node:child_process");
    const res = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], { stdio: "inherit" });
    if (res.status !== 0) process.exit(res.status ?? 1);
  }

  const scope = await promptScope();

  const projSettingsPath = path.join(PROJECT_CLAUDE, "settings.json");
  const globSettingsPath = path.join(GLOBAL_CLAUDE, "settings.json");

  const projectHook = {
    hooks: { PostToolUse: [
      {
        matcher: "Edit|Write|MultiEdit",
        hooks: [{ type: "command", command: "node $CLAUDE_PROJECT_DIR/dist/hooks/morphApply.js", timeout: 60 }]
      }
    ] }
  };
  const globalHook = {
    hooks: { PostToolUse: [
      {
        matcher: "Edit|Write|MultiEdit",
        hooks: [{ type: "command", command: "node ~/.claude/hooks/morphApply.js", timeout: 60 }]
      }
    ] }
  };

  if (scope === "project" || scope === "both") {
    await ensureDir(PROJECT_CLAUDE);
    await ensureDir(path.join(PROJECT_CLAUDE, "hooks"));
    await fsp.cp(hookDist, path.join(PROJECT_CLAUDE, "hooks", "morphApply.js"), { force: true });
    await deepMergeSettings(projSettingsPath, projectHook);

    await writeIfMissing(
      path.join(PROJECT_CLAUDE, "commands", "morph-apply.md"),
      `---
argument-hint: [description] [file_path]
description: Apply Morph Fast-Apply to merge a described change into a file.
allowed-tools: Bash(node:*)
---

## Context
- Current git status: !\`git status -s\`

## Your task
Use Morph Fast-Apply to merge the described change into the target file.

Description: $1
File: $2
`
    );

    await writeIfMissing(
      path.join(PROJECT_CLAUDE, "agents", "morph-agent.md"),
      `---
name: morph-agent
description: PROACTIVELY use for structural edits. After any Edit/Write/MultiEdit, call /morph-apply with a succinct description and target file.
tools: Edit, Write, MultiEdit, Bash
---

You are a specialist for reliable merges. When you produce code edits that should be merged safely,
immediately trigger \`/morph-apply "<short description>" <file_path>\` so Morph performs the merge.
Keep diffs surgical; preserve imports, identifiers, formatting, and comments.
`
    );
  }

  if (scope === "global" || scope === "both") {
    await ensureDir(GLOBAL_CLAUDE);
    await ensureDir(path.join(GLOBAL_CLAUDE, "hooks"));
    await fsp.cp(hookDist, path.join(GLOBAL_CLAUDE, "hooks", "morphApply.js"), { force: true });
    await deepMergeSettings(globSettingsPath, globalHook);

    await writeIfMissing(
      path.join(GLOBAL_CLAUDE, "commands", "morph-apply.md"),
      `---
argument-hint: [description] [file_path]
description: Apply Morph Fast-Apply to merge a described change into a file.
allowed-tools: Bash(node:*)
---

## Context
- Current git status: !\`git status -s\`

## Your task
Use Morph Fast-Apply to merge the described change into the target file.

Description: $1
File: $2
`
    );

    await writeIfMissing(
      path.join(GLOBAL_CLAUDE, "agents", "morph-agent.md"),
      `---
name: morph-agent
description: PROACTIVELY use for structural edits. After any Edit/Write/MultiEdit, call /morph-apply with a succinct description and target file.
tools: Edit, Write, MultiEdit, Bash
---

You are a specialist for reliable merges. When you produce code edits that should be merged safely,
immediately trigger \`/morph-apply "<short description>" <file_path>\` so Morph performs the merge.
Keep diffs surgical; preserve imports, identifiers, formatting, and comments.
`
    );
  }

  if (!process.env.MORPH_LLM_API_KEY) {
    try {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const ans = (await rl.question("No MORPH_LLM_API_KEY env detected. Store one securely now? (y/N) ")).trim().toLowerCase();
      if (ans === "y") {
        const apiKey = await rl.question("Enter Morph API key (input hidden not supported here): ");
        rl.close();
        const keytar = await import("keytar");
        const user = os.userInfo().username;
        await keytar.default.setPassword("morphllm", user, apiKey);
        console.log(pc.green("Stored key in OS keychain via keytar."));
      } else {
        rl.close();
      }
    } catch (e) {
      console.warn(pc.yellow(`Skipping secure store: ${String(e)}`));
    }
  }

  console.log(pc.green("✔ Claude-Code Morph integration installed."));
}

main().catch((e) => {
  console.error(pc.red(String(e)));
  process.exit(1);
});

----------------------------------------------------------------
7) Smoke Test — scripts/smokeHook.sh
----------------------------------------------------------------
Create a script that simulates a PostToolUse payload and runs the hook:

#!/usr/bin/env bash
set -euo pipefail

TMP="scripts/fixtures"
mkdir -p "$TMP"

TARGET="scripts/fixtures/example.ts"
echo 'export const msg = "hello";' > "$TARGET"

cat > "$TMP/postToolUse.json" <<'JSON'
{
  "session_id": "abc123",
  "transcript_path": "/tmp/fake.jsonl",
  "cwd": ".",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "scripts/fixtures/example.ts",
    "content": "export const msg = \"hello world (updated)\";"
  },
  "tool_response": {
    "filePath": "scripts/fixtures/example.ts",
    "success": true
  }
}
JSON

[ -f "dist/hooks/morphApply.js" ] || npm run build

node dist/hooks/morphApply.js < "$TMP/postToolUse.json"

echo
echo "Result:"
cat "$TARGET"
echo
echo "Done."

Make executable:
chmod +x scripts/smokeHook.sh

----------------------------------------------------------------
8) README
----------------------------------------------------------------
Update README with:
- Project vs Global install behavior
- Auto hook behavior: PostToolUse on Edit|Write|MultiEdit triggers Morph
- Manual /morph-apply usage
- Subagent behavior (“proactively use…”)
- Secret handling: MORPH_LLM_API_KEY env or keytar
- Rerun installer: npm run setup:claude
- Smoke test: npm run test:hook

----------------------------------------------------------------
9) Apply in this repo
----------------------------------------------------------------
Create files and code exactly as specified, then run:

npm install
npm run build
npm run setup:claude

Choose Project, Global, or Both when prompted.

----------------------------------------------------------------
10) Clean up old git-hook logic (optional)
----------------------------------------------------------------
Remove any prior git pre-commit/watch artifacts and update docs accordingly.

END.
