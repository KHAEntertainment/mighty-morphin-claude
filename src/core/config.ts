import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface Config {
  account: string;
  apiBase: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.morph');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

/**
 * Load configuration from `~/.morph/config.json`.  If the file does
 * not exist, returns a default config.  Any missing fields will be
 * filled with defaults.
 */
export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {
      account: '',
      apiBase: 'https://api.morphllm.com',
    };
  }
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return {
      account: parsed.account || '',
      apiBase: parsed.apiBase || 'https://api.morphllm.com',
    };
  } catch (err) {
    return {
      account: '',
      apiBase: 'https://api.morphllm.com',
    };
  }
}

/**
 * Persist configuration to disk.  Ensures the containing directory
 * exists first.
 */
export function saveConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Path to the configuration file.  Exposed for tests.
 */
export function configPath(): string {
  return CONFIG_PATH;
}