#!/usr/bin/env node
/**
 * Entry point for the Mighty‑Morphin‑Claude CLI.  This file wires together the
 * various subcommands defined in the `commands` directory.  The CLI
 * intentionally performs minimal work itself; heavy lifting happens in
 * individual command modules.
 */

import { Command } from 'commander';

// Import subcommands lazily to keep startup times low.  Each command
// registers itself on the passed `Command` instance.
import installCommand from './commands/install.js';
import watchCommand from './commands/watch.js';
import enqueueCommand from './commands/enqueue.js';
import precommitCommand from './commands/precommit.js';
import statusCommand from './commands/status.js';
import githookCommand from './commands/githook.js';

/**
 * Returns the version string from package.json.  This function avoids
 * bundling the entire JSON at runtime by using a dynamic import when
 * executed in a Node environment.
 */
async function getVersion(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = await import('../package.json', { assert: { type: 'json' } });
  return pkg.default.version;
}

async function main(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name('m-m_claude')
    .description('Mighty‑Morphin‑Claude: MorphLLM Fast‑Apply command/hook integration')
    .version(await getVersion(), '-v, --version', 'output the current version');

  // Register subcommands
  installCommand(program);
  watchCommand(program);
  enqueueCommand(program);
  precommitCommand(program);
  statusCommand(program);
  githookCommand(program);

  program.parse(argv);
}

// Kick off the CLI.  Catch errors so that rejected promises
// propagate as proper exit codes.
main(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
