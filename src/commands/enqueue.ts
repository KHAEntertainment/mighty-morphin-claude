import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

export default function enqueueCommand(program: Command): void {
  program
    .command('enqueue <goal>')
    .description('Enqueue an edit intent for processing')
    .option('-f, --files <globs>', 'Comma‑separated list of glob patterns', '')
    .option('-i, --id <identifier>', 'Custom identifier for the intent')
    .option('-d, --dry-run', 'Perform a dry run (no file modifications)')
    .action(async (goal: string, opts: { files: string; id?: string; dryRun?: boolean }) => {
      const queueDir = path.resolve('.morph', 'queue');
      fs.mkdirSync(queueDir, { recursive: true });
      const id = opts.id || new Date().toISOString().replace(/[:.]/g, '-') + '_' + uuidv4();
      const intent = {
        id,
        goal,
        files: opts.files ? opts.files.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        dryRun: Boolean(opts.dryRun),
      };
      const filePath = path.join(queueDir, `${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(intent, null, 2), 'utf8');
      console.log(`Enqueued intent ${id} → ${filePath}`);
    });
}