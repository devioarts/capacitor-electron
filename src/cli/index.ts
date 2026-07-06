#!/usr/bin/env node
// cap-electron command dispatcher. Keeps each subcommand in its own file while exposing one bin.
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const currentFile = fileURLToPath(import.meta.url);
const __dirname = dirname(currentFile);
const command = process.argv[2];
const scriptExt = currentFile.endsWith('.ts') ? '.ts' : '.js';

const scriptPath = (name: string): string => join(__dirname, `${name}${scriptExt}`);

const scripts: Record<string, string> = {
  scripts: scriptPath('scripts'),
  add:     scriptPath('add'),
  copy:    scriptPath('copy'),
  prepare: scriptPath('prepare'),
  update:  scriptPath('update'),
  sync:    scriptPath('sync'),
  run:     scriptPath('run'),
  open:    scriptPath('run'),   // alias
  build:   scriptPath('build'),
  kill:    scriptPath('kill'),
  upgrade: scriptPath('upgrade'),
  restore: scriptPath('upgrade'),
};

const script = scripts[command ?? ''];
if (!script) {
  console.error(`npx cap-electron: unknown command "${command ?? ''}"`);
  console.log('Usage: npx cap-electron <scripts|add|copy|prepare|update|sync [--all]|run|build|kill|upgrade [--all]|restore>');
  process.exit(1);
}

try {
  execFileSync(process.execPath, [script, ...process.argv.slice(3)], { stdio: 'inherit' });
} catch {
  process.exit(1); // sub-script already printed its own error
}
