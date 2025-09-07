import { Command } from 'commander';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { createBackend, FilePayload } from '../core/backend.js';
import { applyEdits } from '../core/patch.js';
import { readFiles } from '../core/fsutils.js';
import { writeLog } from '../core/log.js';
import { loadConfig } from '../core/config.js';

export default function precommitCommand(program: Command): void {
  program
    .command('precommit')
    .description('Reconcile staged changes with Morph before committing')
    .action(async () => {
      // Determine staged files
      let staged: string;
      try {
        staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
      } catch (err) {
        console.error('Failed to list staged files. Is this a Git repository?');
        process.exit(1);
      }
      const files = staged
        .split(/\r?\n/)
        .map((f) => f.trim())
        .filter((f) => f && !f.startsWith('.'));
      const exts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'];
      const filtered = files.filter((f) => exts.includes(path.extname(f)));
      if (filtered.length === 0) {
        return;
      }
      // Determine goal
      const planPath = path.join('.morph', 'plan.md');
      let goal: string;
      if (fs.existsSync(planPath)) {
        goal = fs.readFileSync(planPath, 'utf8');
      } else {
        goal = 'Reconcile staged changes; fix imports/renames/formatting.';
      }
      const cfg = loadConfig();
      const backend = await createBackend(cfg.account || '');
      const payload: FilePayload[] = readFiles(filtered);
      try {
        const result = await backend.apply(goal, payload, false);
        const { diffs } = applyEdits(result.edits, false);
        if (Object.keys(diffs).length > 0) {
          // Unexpected diff during precommit; write logs and abort
          const id = new Date().toISOString().replace(/[:.]/g, '-') + '_precommit';
          let log = `${goal}\n`;
          log += `Staged files: ${filtered.length}\n`;
          log += result.logs || '';
          log += '\nDiffs:\n';
          for (const [file, diff] of Object.entries(diffs)) {
            log += `=== ${file} ===\n${diff}\n`;
          }
          writeLog({ id, status: 'error', content: log });
          console.error('Morph produced unified diffs during precommit.  Commit aborted.');
          process.exit(1);
        }
        // Re‑add files to staging in case they changed
        execSync('git add -A');
      } catch (err) {
        console.error('Morph precommit failed:', err);
        process.exit(1);
      }
    });
}