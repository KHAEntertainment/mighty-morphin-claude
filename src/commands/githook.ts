import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';

function installHook() {
  const gitDir = path.resolve('.git');
  if (!fs.existsSync(gitDir)) {
    console.error('No .git directory found. Initialise a Git repository first.');
    process.exit(1);
  }
  const hooksDir = path.join(gitDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, 'pre-commit');
  const script = '#!/usr/bin/env bash\nset -euo pipefail\nexec m-m_claude precommit\n';
  fs.writeFileSync(hookPath, script, { mode: 0o755 });
  console.log('Installed pre-commit hook.');
}

function uninstallHook() {
  const hookPath = path.resolve('.git/hooks/pre-commit');
  if (fs.existsSync(hookPath)) {
    fs.unlinkSync(hookPath);
    console.log('Removed pre-commit hook.');
  } else {
    console.log('No pre-commit hook found to remove.');
  }
}

export default function githookCommand(program: Command): void {
  const cmd = program
    .command('githook')
    .description('Manage Git hooks for m-m_claude');
  cmd
    .command('install')
    .description('Install the pre-commit hook')
    .action(() => installHook());
  cmd
    .command('uninstall')
    .description('Uninstall the pre-commit hook')
    .action(() => uninstallHook());
}
