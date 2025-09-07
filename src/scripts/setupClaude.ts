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
    console.log(pc.cyan ? pc.cyan("Building project...") : "Building project...");
    const { spawnSync } = await import("node:child_process");
    const res = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], { stdio: "inherit" });
    if (res.status !== 0) process.exit(res.status ?? 1);
  }

  const scope = await promptScope();

  const projSettingsPath = path.join(PROJECT_CLAUDE, "settings.json");
  const globSettingsPath = path.join(GLOBAL_CLAUDE, "settings.json");

  const projectHookPath = path.join(PROJECT_CLAUDE, "hooks", "morphApply.js");
  const globalHookPath = path.join(GLOBAL_CLAUDE, "hooks", "morphApply.js");

  const projectHook = {
    hooks: { PostToolUse: [
      {
        matcher: "Edit|Write|MultiEdit",
        hooks: [
          {
            type: "command",
            command: `node "${projectHookPath}"`,
            timeout: 60
          }
        ]
      }
    ] }
  };

  const globalHook = {
    hooks: { PostToolUse: [
      {
        matcher: "Edit|Write|MultiEdit",
        hooks: [
          {
            type: "command",
            command: `node "${globalHookPath}"`,
            timeout: 60
          }
        ]
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
      `---\nargument-hint: [description] [file_path]\ndescription: Apply Morph Fast-Apply to merge a described change into a file.\nallowed-tools: Bash(node:*)\n---\n
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
      `---\nname: morph-agent
description: PROACTIVELY use for structural edits. After any Edit/Write/MultiEdit, call /morph-apply with a succinct description and target file.
tools: Edit, Write, MultiEdit, Bash
---\n
You are a specialist for reliable merges. When you produce code edits that should be merged safely,
immediately trigger \
/morph-apply \"<short description>\" <file_path>\
 so Morph performs the merge.
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
      `---\nargument-hint: [description] [file_path]\ndescription: Apply Morph Fast-Apply to merge a described change into a file.\nallowed-tools: Bash(node:*)\n---\n
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
      `---\nname: morph-agent
description: PROACTIVELY use for structural edits. After any Edit/Write/MultiEdit, call /morph-apply with a succinct description and target file.
tools: Edit, Write, MultiEdit, Bash
---\n
You are a specialist for reliable merges. When you produce code edits that should be merged safely,
immediately trigger \
/morph-apply \"<short description>\" <file_path>\
 so Morph performs the merge.
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
