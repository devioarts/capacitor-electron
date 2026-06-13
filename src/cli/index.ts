#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];

const scripts: Record<string, string> = {
  scripts: join(__dirname, 'scripts.js'),
  add:     join(__dirname, 'add.js'),      // called by Capacitor CLI / cap add electron
  sync:    join(__dirname, 'update.js'),
  copy:    join(__dirname, 'copy.js'),
  open:    join(__dirname, 'open.js'),
  kill:    join(__dirname, 'kill.js'),
};

const script = scripts[command ?? ''];
if (!script) {
  console.error(`cap-electron: unknown command "${command ?? ''}"`);
  console.log('Usage: cap-electron <scripts|sync|copy|open|kill>');
  process.exit(1);
}

execFileSync(process.execPath, [script], { stdio: 'inherit' });
