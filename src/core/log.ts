import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('.morph', 'out');

export interface LogOptions {
  id: string;
  status: 'ok' | 'error';
  content: string;
}

/**
 * Write a log file to `.morph/out`.  Ensures that the directory exists
 * before attempting to write.
 */
export function writeLog({ id, status, content }: LogOptions): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const filename = `${id}.${status}.log`;
  fs.writeFileSync(path.join(OUT_DIR, filename), content, 'utf8');
}

/**
 * Read the last N log entries from `.morph/out` sorted by modification time.
 */
export function readRecentLogs(limit = 10): { id: string; status: string; time: Date; goal: string; file: string }[] {
  if (!fs.existsSync(OUT_DIR)) return [];
  const entries = fs.readdirSync(OUT_DIR)
    .filter((f) => f.endsWith('.log'))
    .map((f) => {
      const stat = fs.statSync(path.join(OUT_DIR, f));
      return { file: f, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    .slice(0, limit)
    .map(({ file }) => {
      const [id, status] = file.split('.');
      const time = fs.statSync(path.join(OUT_DIR, file)).mtime;
      const content = fs.readFileSync(path.join(OUT_DIR, file), 'utf8');
      const firstLine = content.split(/\r?\n/, 2)[0] || '';
      return { id, status, time, goal: firstLine, file };
    });
  return entries;
}