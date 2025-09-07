import { Command } from 'commander';
import readline from 'node:readline/promises';
import { defaultAccount, getApiKey, setApiKey, deleteApiKey } from '../core/keychain.js';
import { loadConfig, saveConfig } from '../core/config.js';

/**
 * Register the `install` command on the given program.  This command
 * configures the Morph API key by storing it in the OS keychain and
 * writes configuration values to `~/.morph/config.json`.
 */
export default function installCommand(program: Command): void {
  program
    .command('install')
    .description('Configure and store your Morph API key')
    .option('-a, --account <name>', 'Override account name (default: current user)')
    .option('-r, --reset', 'Reset the stored key even if it exists')
    .option('-p, --print', 'Print whether a key is currently stored and exit')
    .action(async (opts: { account?: string; reset?: boolean; print?: boolean }) => {
      const account = opts.account || defaultAccount();
      // Load existing config and update account if needed
      const cfg = loadConfig();
      cfg.account = account;
      saveConfig(cfg);
      if (opts.print) {
        const key = await getApiKey(account);
        if (key) {
          console.log(`An API key is stored for account "${account}".`);
        } else {
          console.log(`No API key found for account "${account}".`);
        }
        return;
      }
      if (opts.reset) {
        await deleteApiKey(account);
      } else {
        const existing = await getApiKey(account);
        if (existing) {
          console.log(`An API key already exists for account "${account}".`);
          console.log('Use --reset to replace it.');
          return;
        }
      }
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      try {
        const key = await rl.question('Enter your Morph API key: ');
        if (!key.trim()) {
          console.error('No key entered.');
          process.exit(1);
        }
        await setApiKey(account, key.trim());
        console.log(`API key stored for account "${account}".`);
      } finally {
        rl.close();
      }
    });
}