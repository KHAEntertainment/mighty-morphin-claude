import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { loadConfig } from './config.js';
import { getApiKey } from './keychain.js';

export interface FilePayload {
  path: string;
  content: string;
}

export interface Edit {
  path: string;
  patch: string;
}

export interface ApplyResult {
  edits: Edit[];
  logs: string;
}

export interface Backend {
  apply(goal: string, files: FilePayload[], dryRun: boolean): Promise<ApplyResult>;
}

/**
 * Factory that creates a backend based on availability of the Morph CLI.
 * Falls back to HTTP if the CLI is not found.
 */
export async function createBackend(account: string): Promise<Backend> {
  const cliPath = await findMorphCli();
  if (cliPath) {
    return new CliBackend(cliPath);
  }
  return new HttpBackend(account);
}

async function findMorphCli(): Promise<string | null> {
  // Attempt to locate the `morph-apply` executable on the PATH.
  // Use `which` or fallback to checking common directories.
  const candidates: string[] = ['morph-apply'];
  for (const candidate of candidates) {
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(candidate, ['--help'], { stdio: 'ignore' });
        proc.on('error', () => reject());
        proc.on('exit', (code) => {
          if (code === 0) resolve();
          else reject();
        });
      });
      return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

class CliBackend implements Backend {
  constructor(private binary: string) {}

  async apply(goal: string, files: FilePayload[], dryRun: boolean): Promise<ApplyResult> {
    // Build arguments: --goal <goal> --files file1 file2 ...
    const args = ['--goal', goal, '--files', ...files.map((f) => f.path)];
    if (dryRun) args.push('--dry-run');
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(this.binary, args);
      proc.stdout.on('data', (chunk) => stdoutChunks.push(String(chunk)));
      proc.stderr.on('data', (chunk) => stderrChunks.push(String(chunk)));
      proc.on('error', (err) => reject(err));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`morph-apply exited with code ${code}\n${stderrChunks.join('')}`));
      });
    });
    // The CLI prints unified diffs or logs; we cannot parse edits here, so
    // return an empty edit list and embed the output in logs.  Clients
    // consuming a CLI backend should treat `logs` as human‑readable output.
    return {
      edits: [],
      logs: stdoutChunks.join(''),
    };
  }
}

class HttpBackend implements Backend {
  private account: string;
  private apiBase: string;
  constructor(account: string) {
    this.account = account;
    const cfg = loadConfig();
    this.apiBase = cfg.apiBase || 'https://api.morphllm.com';
  }

  async apply(goal: string, files: FilePayload[], dryRun: boolean): Promise<ApplyResult> {
    const apiKey = await getApiKey(this.account);
    if (!apiKey) {
      throw new Error('No Morph API key available.  Run `morph-hook install` first.');
    }
    const payload = {
      goal,
      dryRun,
      files,
    };
    const url = `${this.apiBase.replace(/\/$/, '')}/apply`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Morph API responded with ${res.status}: ${text}`);
    }
    const data = (await res.json()) as ApplyResult;
    return data;
  }
}