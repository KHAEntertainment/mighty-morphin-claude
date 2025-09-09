import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import pc from "picocolors";
import stripJsonComments from 'strip-json-comments';

type Scope = "project" | "global" | "both";

const PROJECT_CLAUDE = path.resolve(".claude");
const GLOBAL_CLAUDE = path.join(os.homedir(), ".claude");

function printHeader() {
  const line = pc.green("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n" + line);
  console.log(pc.bold(pc.green(" Mighty‑Morphin‑Claude • Claude‑Code Integration")));
  console.log(line);
  console.log(pc.green(" Mighty‑Morphin‑Claude is part of The Hive ecosystem."));
  console.log(pc.green(" Learn more: https://hivecli.com"));
  console.log(pc.green(" GitHub:   https://github.com/KHAEntertainment/mighty-morphin-claude"));
  console.log(line + "\n");
}

async function promptYesNo(question: string, def: boolean = false): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const suffix = def ? " (Y/n) " : " (y/N) ";
  const ans = (await rl.question(question + suffix)).trim().toLowerCase();
  rl.close();
  if (!ans) return def;
  return ans === "y" || ans === "yes";
}

/**
 * Prompt the user (unless running noninteractive) to choose the installation scope for the integration.
 *
 * If the CLI was invoked with `--noninteractive` this immediately returns `"project"`.
 * Otherwise it asks the user to choose:
 * - `1` or any other input → `"project"`
 * - `2` → `"global"`
 * - `3` → `"both"`
 *
 * @returns The chosen scope: `"project" | "global" | "both"`.
 */
async function promptScope(): Promise<Scope> {
  if (process.argv.includes("--noninteractive")) return "project";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = [
    pc.bold("Install Mighty‑Morphin‑Claude hooks to:"),
    "  1) Project (.claude)",
    "  2) Global   (~/.claude)",
    "  3) Both",
    "Choose [1/2/3]: ",
  ].join("\n");
  const ans = (await rl.question(prompt)).trim();
  rl.close();
  if (ans === "2") return "global";
  if (ans === "3") return "both";
  return "project";
}

/**
 * Create a directory and any missing parent directories.
 *
 * @param p - Filesystem path of the directory to create; parents will be created as needed.
 * @returns A promise that resolves when the directory has been created.
 */
async function ensureDir(p: string) { await fsp.mkdir(p, { recursive: true }); }
/**
 * Synchronously checks whether a filesystem path exists and is accessible.
 *
 * @param p - Filesystem path to check
 * @returns True if the path exists and is accessible, otherwise false
 */
function exists(p: string) { try { fs.accessSync(p); return true; } catch { return false; } }

/**
 * Merge PostToolUse hook entries into a JSON settings file, deduplicating by matcher and hook list.
 *
 * Ensures the destination settings file exists (creates parent directories if needed), loads its JSON,
 * merges any PostToolUse hooks from `add` into the existing base.hooks.PostToolUse array, and writes the
 * normalized, formatted JSON back to `destPath`.
 *
 * Incoming and existing hooks are deduplicated using a composite key of the JSON-serialized `hooks` array
 * plus the `matcher` string; when duplicates are found, the incoming hook replaces the existing one.
 *
 * @param destPath - Filesystem path to the settings JSON file to update (created if missing).
 * @param add - Object that may contain `hooks.PostToolUse` (an array of hook definitions) to merge.
 */
async function deepMergeSettings(destPath: string, add: { hooks?: { PostToolUse?: unknown[] } }) {
  let base: { hooks?: { PostToolUse?: unknown[] } } = {};
  if (exists(destPath)) {
    try { 
      const fileContent = await fsp.readFile(destPath, "utf8");
      base = JSON.parse(stripJsonComments(fileContent)) as Record<string, unknown>; // Modified this line
    } 
    catch { base = {}; }
  }
  base.hooks ??= {};
  base.hooks.PostToolUse ??= [];

  const incoming = add?.hooks?.PostToolUse ?? [];
  const key = (h: unknown) => JSON.stringify((h as { hooks?: unknown[] })?.hooks ?? []) + ((h as { matcher?: string })?.matcher ?? "");
  const current = new Map<string, unknown>(base.hooks.PostToolUse.map((h: unknown) => [key(h), h]));
  for (const h of incoming) current.set(key(h), h);

  base.hooks.PostToolUse = Array.from(current.values());
  await ensureDir(path.dirname(destPath));
  await fsp.writeFile(destPath, JSON.stringify(base, null, 2), "utf8");
}

/**
 * Write a file only if it does not already exist.
 *
 * Ensures the parent directory exists (created recursively) and writes `content`
 * to the file at `p` using UTF-8 encoding. If the file already exists, no action
 * is taken.
 *
 * @param p - Destination file path
 * @param content - File contents to write when the file is missing
 */
async function writeIfMissing(p: string, content: string) {
  if (exists(p)) return;
  await ensureDir(path.dirname(p));
  await fsp.writeFile(p, content, "utf8");
}

/**
 * Orchestrates installation of the Claude‑Code Morph integration into project and/or global scopes.
 *
 * Ensures the hook implementation exists (runs `npm run build` if needed), copies hook scripts into
 * the selected .claude directories (project: ./ .claude, global: ~/.claude), merges a PostToolUse hook into
 * the corresponding settings.json (deduplicating existing hooks), and writes command and agent Markdown files
 * under commands/ and agents/ when missing.
 *
 * Prompts the user (unless `--noninteractive` is passed) to choose installation scope (project, global, or both)
 * and, if MORPH_LLM_API_KEY is not set, offers to store an API key in the OS keychain via keytar.
 *
 * Side effects:
 * - May run `npm run build` and exit the process on build failure.
 * - Writes files and directories under project and/or global .claude locations.
 * - May call `process.exit` immediately when `--uninstall` is provided.
 *
 * @returns A promise that resolves when installation completes.
 */
async function main() {
  printHeader();
  if (process.argv.includes("--uninstall")) {
    // Best-effort uninstall: clean both project and global scopes.
    const PROJECT_SETTINGS = path.join(PROJECT_CLAUDE, "settings.json");
    const GLOBAL_SETTINGS = path.join(GLOBAL_CLAUDE, "settings.json");

    // Helper: remove hook entries pointing to morphApply.js from a settings file
    const removeHookEntries = async (settingsPath: string, expectedCommandPaths: string[]) => {
      if (!exists(settingsPath)) return;
      try {
        const fileContent = await fsp.readFile(settingsPath, "utf8");
        const json = JSON.parse(stripJsonComments(fileContent)) as Record<string, any>;
        const hooks = (json?.hooks ?? {}) as { PostToolUse?: any[] };
        const current = Array.isArray(hooks.PostToolUse) ? hooks.PostToolUse : [];
        const isOurEntry = (entry: any) => {
          const matcher: string | undefined = entry?.matcher;
          const subhooks: any[] = Array.isArray(entry?.hooks) ? entry.hooks : [];
          const hasCommand = subhooks.some((h) => typeof h?.command === "string" && (
            expectedCommandPaths.includes(h.command) || h.command.includes("/hooks/morphApply.js")
          ));
          return (matcher === "Edit|Write|MultiEdit" && hasCommand) || hasCommand;
        };
        const filtered = current.filter((e) => !isOurEntry(e));
        json.hooks ??= {};
        if (filtered.length > 0) json.hooks.PostToolUse = filtered; else delete json.hooks.PostToolUse;
        await fsp.writeFile(settingsPath, JSON.stringify(json, null, 2), "utf8");
      } catch (e) {
        console.warn(pc.yellow(`Uninstall: failed to update ${settingsPath}: ${String(e)}`));
      }
    };

    const tryUnlink = async (p: string) => { try { if (exists(p)) await fsp.unlink(p); } catch (e) { /* ignore */ } };

    // Project scope cleanup
    const projectHookPath = path.join(PROJECT_CLAUDE, "hooks", "morphApply.js");
    const projectCmdPath  = path.join(PROJECT_CLAUDE, "commands", "morph-apply.md");
    const projectAgentPath= path.join(PROJECT_CLAUDE, "agents", "morph-agent.md");
    await removeHookEntries(PROJECT_SETTINGS, [ `node "${projectHookPath}"`, `node '${projectHookPath}'`, projectHookPath ]);
    await tryUnlink(projectHookPath);
    await tryUnlink(projectCmdPath);
    await tryUnlink(projectAgentPath);

    // Global scope cleanup
    const globalHookPath = path.join(GLOBAL_CLAUDE, "hooks", "morphApply.js");
    const globalCmdPath  = path.join(GLOBAL_CLAUDE, "commands", "morph-apply.md");
    const globalAgentPath= path.join(GLOBAL_CLAUDE, "agents", "morph-agent.md");
    await removeHookEntries(GLOBAL_SETTINGS, [ `node "${globalHookPath}"`, `node '${globalHookPath}'`, globalHookPath ]);
    await tryUnlink(globalHookPath);
    await tryUnlink(globalCmdPath);
    await tryUnlink(globalAgentPath);

    console.log(pc.green("✔ Mighty‑Morphin‑Claude integration uninstalled (best‑effort)."));
    process.exit(0);
  }

  const hookDist = path.resolve("dist/hook-entrypoint.js");
  if (!exists(hookDist)) {
    console.log(pc.green("⏳ Building Mighty‑Morphin‑Claude…"));
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
      `---
argument-hint: [description] [file_path]
description: Apply Morph Fast-Apply to merge a described change into a file.
allowed-tools: Bash(node:*)
---

## Context
- Current git status: ! 
 
  git status -s

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
description: PROACTIVELY use for structural edits. After any Edit/Write/MultiEdit, call /morph-apply with a succinct description and file_path.
tools: Edit, Write, MultiEdit, Bash
---

You are a specialist for reliable merges. When you produce code edits that should be merged safely,
immediately trigger 
/morph-apply "<short description>" <file_path>
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
      `---
argument-hint: [description] [file_path]
description: Apply Morph Fast-Apply to merge a described change into a file.
allowed-tools: Bash(node:*)
---

## Context
- Current git status: ! 
 
  git status -s

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
description: PROACTIVELY use for structural edits. After any Edit/Write/MultiEdit, call /morph-apply with a succinct description and file_path.
tools: Edit, Write, MultiEdit, Bash
---

You are a specialist for reliable merges. When you produce code edits that should be merged safely,
immediately trigger 
/morph-apply "<short description>" <file_path>
 so Morph performs the merge.
Keep diffs surgical; preserve imports, identifiers, formatting, and comments.
`
    );
  }

  // API key configuration and fallback handling
  const DEVCONTAINER_DIR = path.join(process.cwd(), ".devcontainer");
  const DEVCONTAINER_JSON_PATH = path.join(DEVCONTAINER_DIR, "devcontainer.json");
  const DEVCONTAINER_DOCKERFILE_PATH = path.join(DEVCONTAINER_DIR, "Dockerfile");

  if (!process.env.MORPH_LLM_API_KEY) {
    try {
      const proceed = process.argv.includes("--noninteractive")
        ? false
        : await promptYesNo(pc.bold("No MORPH_LLM_API_KEY found. Store one securely in the OS keychain now?"));
      if (proceed) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const apiKey = await rl.question(pc.bold("Enter Morph API key") + pc.dim(" (input not hidden here)") + ": ");
        rl.close();
        try {
          const keytar = await import("keytar");
          const user = os.userInfo().username;
          await keytar.default.setPassword("morphllm", user, apiKey);
          console.log(pc.green("✔ Stored key in OS keychain via keytar."));
        } catch (e: unknown) {
          const msg = String(e || "");
          console.log(pc.yellow("⚠️  Secure key storage failed."));
          console.log(pc.dim(msg));

          const inDevContainer = exists(DEVCONTAINER_JSON_PATH) || process.env.CODESPACES === 'true' || process.env.DEVCONTAINER === 'true';
          if (inDevContainer) {
            // Offer to write the key into devcontainer.json (containerEnv)
            const useDevcontainer = await promptYesNo(
              pc.bold("Add MORPH_LLM_API_KEY to .devcontainer/devcontainer.json (containerEnv) so it persists in this container?"),
              true
            );
            if (useDevcontainer) {
              try {
                let devcontainerConfig: Record<string, any> = {};
                if (exists(DEVCONTAINER_JSON_PATH)) {
                  const fileContent = await fsp.readFile(DEVCONTAINER_JSON_PATH, "utf8");
                  devcontainerConfig = JSON.parse(stripJsonComments(fileContent));
                } else {
                  await ensureDir(DEVCONTAINER_DIR);
                }
                devcontainerConfig.containerEnv ??= {};
                devcontainerConfig.containerEnv.MORPH_LLM_API_KEY = apiKey;
                await fsp.writeFile(DEVCONTAINER_JSON_PATH, JSON.stringify(devcontainerConfig, null, 2), "utf8");
                console.log(pc.green(`✔ Added MORPH_LLM_API_KEY to ${DEVCONTAINER_JSON_PATH} (containerEnv).`));
                console.log(pc.gray("Rebuild the container to apply environment changes."));
              } catch (err) {
                console.log(pc.red("✖ Failed to update devcontainer.json."));
                console.log(pc.dim(String(err)));
              }
            } else {
              console.log(pc.yellow("Skipping devcontainer env configuration."));
            }
          } else {
            console.log(pc.yellow("Tip: set MORPH_LLM_API_KEY in your shell or CI environment."));
            console.log(pc.dim("Example: export MORPH_LLM_API_KEY=sk-..."));
          }
        }
      }
    } catch (e) {
      console.warn(pc.yellow(`Key setup skipped: ${String(e)}`));
    }
  } else {
    console.log(pc.gray("MORPH_LLM_API_KEY detected in environment; skipping keychain setup."));
  }

  console.log(pc.green("\n✔ Mighty‑Morphin‑Claude integration installed."));

  // Dev Container NODE_PATH and libsecret patching
  if (exists(DEVCONTAINER_JSON_PATH)) {
    let ans = "n"; // Default to 'n' for non-interactive
    if (!process.argv.includes("--noninteractive")) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      ans = (await rl.question(
        pc.bold("Dev Container detected. Patch settings for compatibility (NODE_PATH, Dockerfile)?") + " (y/N) "
      )).trim().toLowerCase();
      rl.close();
    }

    if (ans === "y") {
      let devcontainerConfig: Record<string, unknown> = {};
      try {
        const fileContent = await fsp.readFile(DEVCONTAINER_JSON_PATH, "utf8");
        devcontainerConfig = JSON.parse(stripJsonComments(fileContent)) as Record<string, unknown>; // Modified this line
      } catch (e: unknown) {
        console.warn(pc.yellow(`Failed to read or parse ${DEVCONTAINER_JSON_PATH}: ${String(e)}`));
      }

      // Patch NODE_PATH
      devcontainerConfig.remoteEnv ??= {};
      const nodePathValue = "/usr/local/share/nvm/versions/node/current/lib/node_modules";
      if ((devcontainerConfig.remoteEnv as Record<string, string>).NODE_PATH !== nodePathValue) {
        (devcontainerConfig.remoteEnv as Record<string, string>).NODE_PATH = nodePathValue;
        console.log(pc.green(`✔ Patched ${DEVCONTAINER_JSON_PATH} with NODE_PATH.`));
      } else {
        console.log(pc.gray(`${DEVCONTAINER_JSON_PATH} already contains correct NODE_PATH.`));
      }
      // Patch Dockerfile reference
      if (!devcontainerConfig.build || (devcontainerConfig.build as Record<string, unknown>).dockerfile !== "Dockerfile") {
        devcontainerConfig.build = {
          dockerfile: "Dockerfile"
        };
        console.log(pc.green(`✔ Patched ${DEVCONTAINER_JSON_PATH} to use Dockerfile.`));
      } else {
        console.log(pc.gray(`${DEVCONTAINER_JSON_PATH} already uses Dockerfile.`));
      }

      await fsp.writeFile(DEVCONTAINER_JSON_PATH, JSON.stringify(devcontainerConfig, null, 2), "utf8");

      // Create Dockerfile
      const dockerfileContent = `FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install system dependencies for keytar (libsecret)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsecret-1-dev \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
`;
      if (!exists(DEVCONTAINER_DOCKERFILE_PATH)) {
        await fsp.writeFile(DEVCONTAINER_DOCKERFILE_PATH, dockerfileContent, "utf8");
        console.log(pc.green(`✔ Created ${DEVCONTAINER_DOCKERFILE_PATH} for keytar compatibility.`));
      } else {
        console.log(pc.gray(`${DEVCONTAINER_DOCKERFILE_PATH} already exists.`));
      }
    }
  }
}

main().catch((e: unknown) => {
  console.error(pc.red(String(e)));
  process.exit(1);
});
