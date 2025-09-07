import fs from 'node:fs';
import path from 'node:path';
import * as glob from 'glob';

export interface ResolvedFile {
  path: string;
  content: string;
}

/**
 * Resolve a list of glob patterns into unique file paths.  Directories
 * are ignored.  Hidden files are included by default unless the pattern
 * explicitly excludes them.
 */
export function resolveGlobs(patterns: string[], cwd: string): string[] {
  const files: Set<string> = new Set();
  for (const pattern of patterns) {
    const matches = glob.sync(pattern, { cwd, nodir: true, dot: true });
    for (const match of matches) {
      files.add(path.resolve(cwd, match));
    }
  }
  return Array.from(files);
}

/**
 * Read the contents of the given files into a payload array.  Binary
 * files are ignored by attempting a UTF‑8 decode.  If decoding fails
 * the file is skipped.
 */
export function readFiles(paths: string[]): ResolvedFile[] {
  const out: ResolvedFile[] = [];
  for (const filePath of paths) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      out.push({ path: filePath, content });
    } catch {
      // Skip binary or unreadable files
    }
  }
  return out;
}