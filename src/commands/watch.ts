import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { createBackend, FilePayload } from '../core/backend.js';
import { resolveGlobs, readFiles } from '../core/fsutils.js';
import { applyEdits } from '../core/patch.js';
import { writeLog } from '../core/log.js';
import { loadConfig } from '../core/config.js';

interface Intent {
  id?: string;
  workdir?: string;
  goal: string;
  hints?: string[];
  files?: string[];
  dryRun?: boolean;
}

export default function watchCommand(program: Command): void {
  program
    .command('watch')
    .description('Watch the queue for edit intents and process them')
    .option('-q, --queue <dir>', 'Path to queue directory', '.morph/queue')
    .action(async (opts: { queue: string }) => {
      const queueDir = path.resolve(opts.queue);
      fs.mkdirSync(queueDir, { recursive: true });
      console.log(`Watching ${queueDir} for intents...`);
      const cfg = loadConfig();
      const backend = await createBackend(cfg.account || '');
      const handleFile = async (file: string): Promise<void> => {
        const id = path.basename(file, '.json');
        try {
          const data = fs.readFileSync(file, 'utf8');
          const intent: Intent = JSON.parse(data);
          const workdir = path.resolve(intent.workdir || '.');
          const patterns = intent.files && intent.files.length > 0 ? intent.files : ['src/**/*', '*.ts', '*.js'];
          const files = resolveGlobs(patterns, workdir);
          const payload: FilePayload[] = readFiles(files);
          const result = await backend.apply(intent.goal, payload, Boolean(intent.dryRun));
          const { diffs } = applyEdits(result.edits, Boolean(intent.dryRun));
          let logContent = `${intent.goal}\n`;
          logContent += `Files: ${payload.length}\n`;
          logContent += result.logs || '';
          if (Object.keys(diffs).length > 0) {
            logContent += '\nDiffs:\n';
            for (const [f, d] of Object.entries(diffs)) {
              logContent += `=== ${f} ===\n${d}\n`;
            }
          }
          writeLog({ id: id, status: 'ok', content: logContent });
          fs.unlinkSync(file);
          console.log(`[m-m_claude] processed ${id}`);
        } catch (err) {
          writeLog({ id: id, status: 'error', content: String(err) });
          fs.unlinkSync(file);
          console.error(`[m-m_claude] error processing ${id}:`, err);
        }
      };
      // Initial scan
      for (const f of fs.readdirSync(queueDir)) {
        if (f.endsWith('.json')) {
          await handleFile(path.join(queueDir, f));
        }
      }
      // Watch for new files
      fs.watch(queueDir, { persistent: true }, (event, filename) => {
        if (!filename || !filename.endsWith('.json')) return;
        const full = path.join(queueDir, filename);
        // Debounce short delay to avoid partial writes
        setTimeout(() => {
          if (fs.existsSync(full)) {
            handleFile(full).catch((err) => {
              console.error('[m-m_claude] unexpected error:', err);
            });
          }
        }, 150);
      });
    });
}
