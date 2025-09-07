import fs from 'node:fs';
import path from 'node:path';
import { Edit } from './backend.js';

/**
 * Apply a list of edits to the file system.  If `dryRun` is true the
 * edits will not be written to disk; instead unified diffs will be
 * returned in the `diffs` map.  This is a simple implementation and
 * does not attempt to parse unified diffs.  If a patch string starts
 * with a diff header it will be treated as a diff and left for the
 * user to apply manually.
 */
export function applyEdits(edits: Edit[], dryRun: boolean): { diffs: Record<string, string> } {
  const diffs: Record<string, string> = {};
  for (const edit of edits) {
    const { path: filePath, patch } = edit;
    // Heuristically detect unified diff
    const isDiff = /^(diff --git|@@|---\s|\+\+\+\s)/m.test(patch);
    if (dryRun || isDiff) {
      diffs[filePath] = patch;
      continue;
    }
    // Otherwise treat the patch as full file content
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, patch, 'utf8');
  }
  return { diffs };
}