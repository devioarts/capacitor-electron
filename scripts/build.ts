#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { rm, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { build } from 'esbuild';
import { create } from 'tar';

const root = resolve('.');

console.log('→ clean dist/');
await rm(join(root, 'dist'), { recursive: true, force: true });
await mkdir(join(root, 'dist'), { recursive: true });

console.log('→ types (tsc)');
execSync('tsc --emitDeclarationOnly', { stdio: 'inherit', cwd: root });

console.log('→ shared types (esbuild ESM + CJS)');
await build({
  entryPoints: [join(root, 'src', 'shared', 'types.ts')],
  outfile: join(root, 'dist', 'shared', 'types.js'),
  bundle: false,
  platform: 'neutral',
  format: 'esm',
});
await build({
  entryPoints: [join(root, 'src', 'shared', 'types.ts')],
  outfile: join(root, 'dist', 'shared', 'types.cjs'),
  bundle: false,
  platform: 'neutral',
  format: 'cjs',
});

console.log('→ CLI scripts (esbuild ESM)');
const cliEntries = ['index', 'add', 'copy', 'update', 'open', 'scripts', 'kill'].map(
  (n) => join(root, 'src', 'cli', `${n}.ts`),
);
await build({
  entryPoints: cliEntries,
  outdir: join(root, 'dist', 'cli'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
  sourcemap: true,
});

console.log('→ packing template-electron.tar.gz');
await create(
  { gzip: true, file: join(root, 'template-electron.tar.gz'), cwd: join(root, 'src') },
  ['template-electron'],
);


console.log('✓ done');
