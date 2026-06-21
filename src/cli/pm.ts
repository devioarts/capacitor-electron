// Package-manager detection used by CLI commands before running install/build scripts.
import * as fs from 'fs';
import * as path from 'path';

export function detectPackageManager(root: string): string {
  if (fs.existsSync(path.join(root, 'bun.lock')))       return 'bun';
  if (fs.existsSync(path.join(root, 'bun.lockb')))      return 'bun';
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock')))      return 'yarn';
  return 'npm';
}
