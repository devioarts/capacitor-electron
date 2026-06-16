#!/usr/bin/env node
// cap-electron upgrade — copies system files from the installed template into electron/,
// leaving all src/user/ files and src/system/generated/ untouched.
// Pass --all to also update electron-builder.js, tsconfig.json, and smart-merge package.json.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { extract } from 'tar';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const marker = `${path.sep}node_modules${path.sep}`;
const markerIdx = __dirname.indexOf(marker);
const capacitorRoot = process.env['CAPACITOR_ROOT_DIR']
  ?? (markerIdx >= 0 ? __dirname.slice(0, markerIdx) : process.cwd());

const electronDir = path.join(capacitorRoot, 'electron');
const includeAll = process.argv.includes('--all');

// Individual files always updated.
const SYSTEM_FILES = [
  'main.ts',
  'src/index.ts',
];

// Directories always updated (all contents replaced).
const SYSTEM_DIRS = [
  'src/system/shared',
  'src/system/static',
];

// Overwritten only with --all.
const OPTIONAL_FILES = [
  'electron-builder.js',
  'tsconfig.json',
];

async function main(): Promise<void> {
  if (!fs.existsSync(electronDir)) {
    console.error('[cap-electron] electron/ not found — run cap-electron add first.');
    process.exit(1);
  }

  const templatePath = path.join(__dirname, '..', '..', 'template-electron.tar.gz');
  if (!fs.existsSync(templatePath)) {
    console.error(`[cap-electron] Template tarball not found: ${templatePath}`);
    process.exit(1);
  }

  let tmpDir: string;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-electron-upgrade-'));
  } catch (e) {
    console.error(`[cap-electron] Failed to create temp directory: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  try {
    await extract({ file: templatePath, cwd: tmpDir, strip: 1 });

    console.log('[cap-electron] Upgrading system files...\n');
    let updated = 0;

    for (const file of SYSTEM_FILES) {
      const src = path.join(tmpDir, file);
      const dest = path.join(electronDir, file);
      if (!fs.existsSync(src)) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      console.log(`  updated  ${file}`);
      updated++;
    }

    for (const dir of SYSTEM_DIRS) {
      const srcDir = path.join(tmpDir, dir);
      if (!fs.existsSync(srcDir)) continue;
      const destDir = path.join(electronDir, dir);
      fs.rmSync(destDir, { recursive: true, force: true });
      copyDirSync(srcDir, destDir);
      console.log(`  updated  ${dir}/`);
      updated++;
    }

    const generatedDir = path.join(electronDir, 'src/system/generated');
    if (fs.existsSync(generatedDir)) {
      fs.rmSync(generatedDir, { recursive: true, force: true });
      console.log('  cleaned  src/system/generated/');
    }

    // Add missing user files (never overwrite existing ones).
    const templateUserDir = path.join(tmpDir, 'src/user');
    const electronUserDir = path.join(electronDir, 'src/user');
    if (fs.existsSync(templateUserDir)) {
      for (const entry of fs.readdirSync(templateUserDir, { withFileTypes: true })) {
        if (entry.isDirectory()) continue;
        const dest = path.join(electronUserDir, entry.name);
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(electronUserDir, { recursive: true });
          fs.copyFileSync(path.join(templateUserDir, entry.name), dest);
          console.log(`  added    src/user/${entry.name} (new file)`);
          updated++;
        }
      }
    }

    if (includeAll) {
      for (const file of OPTIONAL_FILES) {
        const src = path.join(tmpDir, file);
        const dest = path.join(electronDir, file);
        if (!fs.existsSync(src)) continue;
        fs.copyFileSync(src, dest);
        console.log(`  updated  ${file}`);
        updated++;
      }

      const pkgUpdated = mergePackageJson(
        path.join(tmpDir, 'package.json'),
        path.join(electronDir, 'package.json'),
      );
      if (pkgUpdated) {
        console.log('  merged   package.json (scripts, devDependencies, dependencies)');
        updated++;
      }
    }

    console.log(`\n[cap-electron] Done — ${updated} item(s) updated.`);
    if (!includeAll) {
      console.log('  Tip: run with --all to also update electron-builder.js, tsconfig.json, and package.json');
    }

    console.log('\nRunning sync...');
    execFileSync(process.execPath, [path.join(__dirname, 'update.js')], { stdio: 'inherit' });
  } catch (e) {
    console.error(`[cap-electron] Upgrade failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function mergePackageJson(templatePkgPath: string, existingPkgPath: string): boolean {
  if (!fs.existsSync(templatePkgPath) || !fs.existsSync(existingPkgPath)) return false;

  type Pkg = Record<string, unknown>;
  const tpl = JSON.parse(fs.readFileSync(templatePkgPath, 'utf-8')) as Pkg;
  const existing = JSON.parse(fs.readFileSync(existingPkgPath, 'utf-8')) as Pkg;

  const merged: Pkg = {
    ...tpl,
    // Preserve user identity fields
    name:    existing['name']    ?? tpl['name'],
    version: existing['version'] ?? tpl['version'],
    // Merge deps: existing first so user additions are kept, template versions win for shared keys
    dependencies:    { ...(existing['dependencies']    as Pkg ?? {}), ...(tpl['dependencies']    as Pkg ?? {}) },
    devDependencies: { ...(existing['devDependencies'] as Pkg ?? {}), ...(tpl['devDependencies'] as Pkg ?? {}) },
    // Merge scripts: template wins for system scripts, user custom scripts preserved
    scripts: { ...(existing['scripts'] as Pkg ?? {}), ...(tpl['scripts'] as Pkg ?? {}) },
  };

  fs.writeFileSync(existingPkgPath, JSON.stringify(merged, null, 2) + '\n');
  return true;
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

main().catch((e) => {
  console.error(`[cap-electron] Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
