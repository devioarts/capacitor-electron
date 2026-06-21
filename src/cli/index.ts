#!/usr/bin/env node
// cap-electron command dispatcher. Keeps each subcommand in its own file while exposing one bin.
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];

const scripts: Record<string, string> = {
  scripts: join(__dirname, 'scripts.js'),
  add:     join(__dirname, 'add.js'),
  copy:    join(__dirname, 'copy.js'),
  prepare: join(__dirname, 'prepare.js'),
  update:  join(__dirname, 'update.js'),
  sync:    join(__dirname, 'sync.js'),
  run:     join(__dirname, 'run.js'),
  open:    join(__dirname, 'run.js'),   // alias
  build:   join(__dirname, 'build.js'),
  kill:    join(__dirname, 'kill.js'),
  upgrade: join(__dirname, 'upgrade.js'),
  restore: join(__dirname, 'upgrade.js'),
};

const script = scripts[command ?? ''];
if (!script) {
  console.error(`npx cap-electron: unknown command "${command ?? ''}"`);
  console.log('Usage: npx cap-electron <scripts|add|copy|prepare|update|sync|run|build|kill|upgrade|restore>');
  process.exit(1);
}

try {
  execFileSync(process.execPath, [script, ...process.argv.slice(3)], { stdio: 'inherit' });
} catch {
  process.exit(1); // sub-script already printed its own error
}
