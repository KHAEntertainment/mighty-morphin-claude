import { Command } from 'commander';
import { readRecentLogs } from '../core/log.js';

export default function statusCommand(program: Command): void {
  program
    .command('status')
    .description('Show recent Morph operations')
    .option('-n, --limit <number>', 'Number of entries to show', (v) => parseInt(v, 10), 10)
    .option('--json', 'Output in JSON format')
    .action((opts: { limit: number; json?: boolean }) => {
      const entries = readRecentLogs(opts.limit);
      if (opts.json) {
        console.log(JSON.stringify(entries, null, 2));
      } else {
        for (const { id, status, time, goal } of entries) {
          console.log(`${time.toISOString()} [${status}] ${id}: ${goal}`);
        }
      }
    });
}