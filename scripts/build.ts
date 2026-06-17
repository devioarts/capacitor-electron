#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { rm, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { build } from 'esbuild';
import { create } from 'tar';

const root = resolve('.');

console.log('→ clean dist/');
await rm(join(root, 'dist'), { recursive: true, force: true });
await mkdir(join(root, 'dist'), { recursive: true });

// Sync template types into shared/types.ts before tsc, restore after build.
// bridge-types.ts is inlined first (it re-exports from types.ts would create a relative
// import that src/shared/ can't resolve), then types.ts with the re-export line removed.
const sharedTypesPath    = join(root, 'src', 'shared', 'types.ts');
const templateTypesPath  = join(root, 'src', 'template-electron', 'src', 'system', 'shared', 'types.ts');
const bridgeTypesPath    = join(root, 'src', 'template-electron', 'src', 'system', 'shared', 'bridge-types.ts');
const originalShared     = await readFile(sharedTypesPath, 'utf8');
const bridgeContent      = await readFile(bridgeTypesPath, 'utf8');
const templateContent    = await readFile(templateTypesPath, 'utf8');
const templateNoReexport = templateContent.replace(/^export \* from '\.\/bridge-types';\n?/m, '');

await writeFile(sharedTypesPath, bridgeContent + '\n' + templateNoReexport + "\nexport * from './plugin-settings';\n");

try {
  console.log('→ types (tsc)');
  execSync('tsc --emitDeclarationOnly', { stdio: 'inherit', cwd: root });

  console.log('→ globals.d.ts (generate)');
  const globalsContent =
    '// Generated from src/template-electron/src/system/shared/bridge-types.ts — do not edit.\n' +
    '// Reference this file once in your renderer project:\n' +
    '//   /// <reference types="@devioarts/capacitor-electron/globals" />\n' +
    '// cap-electron sync writes that line automatically.\n\n' +
    'export {};\n\n' +
    'declare global {\n' +
    (await readFile(bridgeTypesPath, 'utf8'))
      .replace(/^export /gm, '')
      .split('\n')
      .map((line) => line ? `  ${line}` : line)
      .join('\n') +
    '\n\n  interface Window {\n    Electron: ElectronBridge;\n  }\n}\n';
  await writeFile(join(root, 'dist', 'shared', 'globals.d.ts'), globalsContent);

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

  console.log('→ plugin-settings (esbuild ESM + CJS)');
  await build({
    entryPoints: [join(root, 'src', 'shared', 'plugin-settings.ts')],
    outfile: join(root, 'dist', 'shared', 'plugin-settings.js'),
    bundle: false,
    platform: 'neutral',
    format: 'esm',
  });
  await build({
    entryPoints: [join(root, 'src', 'shared', 'plugin-settings.ts')],
    outfile: join(root, 'dist', 'shared', 'plugin-settings.cjs'),
    bundle: false,
    platform: 'neutral',
    format: 'cjs',
  });

  console.log('→ CLI scripts (esbuild ESM)');
  const cliEntries = ['index', 'add', 'copy', 'update', 'sync', 'run', 'open', 'build', 'scripts', 'kill', 'upgrade'].map(
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

  console.log('→ electron-init.js (copy)');
  await copyFile(
    join(root, 'src', 'template-electron', 'src', 'system', 'js', 'electron-init.js'),
    join(root, 'dist', 'electron-init.js'),
  );

  console.log('→ packing template-electron.tar.gz');
  // Exclude generated/installed artifacts — users get these via npm install + npm run build.
  const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'dist-electron', 'app']);
  await create(
    {
      gzip: true,
      file: join(root, 'template-electron.tar.gz'),
      cwd: join(root, 'src'),
      filter: (p: string) => !p.split(/[/\\]/).some((part) => EXCLUDE_DIRS.has(part)),
    },
    ['template-electron'],
  );

  console.log('✓ done');
} finally {
  await writeFile(sharedTypesPath, originalShared);
}
