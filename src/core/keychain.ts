/**
 * Cross‑platform keychain helpers.  This module wraps the `keytar`
 * dependency behind a simple interface that also respects an environment
 * override (`MORPH_API_KEY`).
 */

import os from 'node:os';
import keytar from 'keytar';

const SERVICE = 'morphllm';

/**
 * Retrieves the stored API key for the given account.  If the
 * `MORPH_API_KEY` environment variable is set it will be returned
 * immediately instead of reading from the system keychain.
 */
export async function getApiKey(account: string): Promise<string | null> {
  const envKey = process.env.MORPH_API_KEY;
  if (envKey) return envKey;
  return keytar.getPassword(SERVICE, account);
}

/**
 * Stores the API key for the given account in the system keychain.  If
 * `MORPH_API_KEY` is set this function becomes a no‑op.
 */
export async function setApiKey(account: string, key: string): Promise<void> {
  if (process.env.MORPH_API_KEY) return;
  await keytar.setPassword(SERVICE, account, key);
}

/**
 * Deletes the API key for the given account from the system keychain.
 */
export async function deleteApiKey(account: string): Promise<void> {
  if (process.env.MORPH_API_KEY) return;
  await keytar.deletePassword(SERVICE, account);
}

/**
 * Derives a sensible default account name based on the current OS user.
 */
export function defaultAccount(): string {
  return os.userInfo().username;
}