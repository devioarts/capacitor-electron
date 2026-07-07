import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cliEntry = join(repoRoot, 'dist', 'cli', 'index.js');

const tempDirs: string[] = [];

beforeAll(() => {
  if (!existsSync(cliEntry)) {
    throw new Error('CLI integration tests require a built dist/. Run `npm run build` before `npm run test:integration`.');
  }
});

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs.length = 0;
});

function tempProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'cap-electron-cli-'));
  tempDirs.push(root);
  mkdirSync(join(root, 'electron', 'src', 'system', 'generated'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'www', 'assets'), { recursive: true });
  mkdirSync(join(root, 'assets'), { recursive: true });

  writeJson(join(root, 'package.json'), {
    name: 'root-app',
    version: '1.2.3',
    description: 'Root app used by cap-electron CLI integration tests',
    license: 'MIT',
    scripts: { build: 'vite build' },
    dependencies: {},
  });
  writeJson(join(root, 'electron', 'package.json'), {
    name: 'old-electron-app',
    version: '0.0.1',
    type: 'module',
    scripts: { build: 'electron-builder' },
  });
  writeJson(join(root, 'electron', 'package-lock.json'), {
    name: 'old-electron-app',
    version: '0.0.1',
    lockfileVersion: 3,
    packages: {
      '': { name: 'old-electron-app', version: '0.0.1', license: 'UNLICENSED' },
    },
  });
  writeJson(join(root, 'electron', 'capacitor.config.json'), { webDir: 'www' });
  writeFileSync(join(root, 'index.html'), '<html><body class="root"><div id="root"></div></body></html>\n');
  writeFileSync(join(root, 'src', 'vite-env.d.ts'), '/// <reference types="vite/client" />\n');
  writeFileSync(join(root, 'www', 'index.html'), '<html><body class="app"><main>web app</main></body></html>\n');
  writeFileSync(join(root, 'www', 'assets', 'app.txt'), 'asset copied by cap-electron copy\n');
  writeFileSync(join(root, 'assets', 'icon.png'), 'icon');
  writeFileSync(join(root, 'assets', 'tray.png'), 'tray');
  writeFileSync(join(root, 'assets', 'splash.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

  return root;
}

function installFakeElectronPlugin(root: string): void {
  const pluginRoot = join(root, 'node_modules', '@example', 'desktop-plugin');
  mkdirSync(join(pluginRoot, 'electron', 'dist'), { recursive: true });
  writeJson(join(pluginRoot, 'package.json'), {
    name: '@example/desktop-plugin',
    version: '1.0.0',
    capacitor: { electron: { src: 'electron' } },
  });
  writeFileSync(
    join(pluginRoot, 'electron', 'dist', 'plugin-settings.js'),
    [
      'module.exports.pluginSettings = {',
      "  pluginClass: 'ExampleDesktopPlugin',",
      "  pluginMethods: ['echo', 'ping'],",
      "  pluginEvents: ['stateChanged'],",
      "  configSections: ['ExampleDesktopPlugin'],",
      '};',
      '',
    ].join('\n'),
  );

  const pkg = readJson(join(root, 'package.json'));
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    '@example/desktop-plugin': '1.0.0',
  };
  writeJson(join(root, 'package.json'), pkg);
}

function capacitorConfig(): Record<string, unknown> {
  return {
    appId: 'com.example.desktop',
    appName: 'Example Desktop',
    webDir: 'www',
    plugins: {
      Electron: {
        browserWindow: { width: 900, height: 700, icon: '/assets/icon.png' },
        ui: {
          trayMenu: { enabled: true, icon: '/assets/tray.png' },
          splashScreen: { image: '/assets/splash.svg', width: 320, height: 180 },
        },
      },
      ExampleDesktopPlugin: { enabled: true, mode: 'test' },
    },
  };
}

function runCli(root: string, args: string[], extraEnv: Record<string, string> = {}): string {
  const result = spawnSync(
    process.execPath,
    [cliEntry, ...args],
    {
      cwd: root,
      encoding: 'utf-8',
      env: {
        ...process.env,
        CAPACITOR_ROOT_DIR: root,
        ...extraEnv,
      },
    },
  );
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.status !== 0) {
    throw new Error(`cap-electron ${args.join(' ')} failed with exit code ${result.status}\n${output}`);
  }
  return output;
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>;
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function countOccurrences(value: string, pattern: string): number {
  return value.split(pattern).length - 1;
}

describe('cap-electron CLI lifecycle', () => {
  it('adds npm scripts without overwriting existing commands and is idempotent', () => {
    const root = tempProject();
    const pkgPath = join(root, 'package.json');
    const pkg = readJson(pkgPath);
    pkg.scripts = {
      ...(pkg.scripts as Record<string, string>),
      'electron:copy': 'custom-copy',
    };
    writeJson(pkgPath, pkg);

    const first = runCli(root, ['scripts']);
    const afterFirst = readJson(pkgPath).scripts as Record<string, string>;
    expect(first).toContain('Added scripts');
    expect(afterFirst['electron:copy']).toBe('custom-copy');
    expect(afterFirst['electron:sync']).toBe('cap-electron sync');
    expect(afterFirst['electron:open']).toBe('cap-electron open');

    const serialized = readFileSync(pkgPath, 'utf-8');
    const second = runCli(root, ['scripts']);
    expect(second).toContain('Already present');
    expect(readFileSync(pkgPath, 'utf-8')).toBe(serialized);
  });

  it('copies built web assets into electron/app and injects one production bootstrap script', () => {
    const root = tempProject();
    mkdirSync(join(root, 'electron', 'app'), { recursive: true });
    writeFileSync(join(root, 'electron', 'app', 'stale.txt'), 'old build output');
    writeFileSync(
      join(root, 'www', 'index.html'),
      '<html><head><script src="/assets/electron-init-stale.js"></script></head><body><main>fresh</main></body></html>',
    );

    const output = runCli(root, ['copy']);
    const appIndex = readFileSync(join(root, 'electron', 'app', 'index.html'), 'utf-8');

    expect(output).toContain('copy electron');
    expect(existsSync(join(root, 'electron', 'app', 'stale.txt'))).toBe(false);
    expect(existsSync(join(root, 'electron', 'app', 'assets', 'app.txt'))).toBe(true);
    expect(existsSync(join(root, 'electron', 'app', 'electron-init.js'))).toBe(true);
    expect(countOccurrences(appIndex, '<script src="/electron-init.js"></script>')).toBe(1);
    expect(appIndex).not.toContain('electron-init-stale.js');
    expect(appIndex).toContain('<body>\n    <script src="/electron-init.js"></script>');
  });

  it('updates generated registries, globals, project bootstrap, config, and Electron asset copies', () => {
    const root = tempProject();
    installFakeElectronPlugin(root);

    runCli(root, ['update'], {
      CAPACITOR_CONFIG: JSON.stringify(capacitorConfig()),
    });

    const preloadAuto = readFileSync(join(root, 'electron', 'src', 'system', 'generated', 'plugins-preload-auto.ts'), 'utf-8');
    const mainAuto = readFileSync(join(root, 'electron', 'src', 'system', 'generated', 'plugins-main-auto.ts'), 'utf-8');
    const rootIndex = readFileSync(join(root, 'index.html'), 'utf-8');
    const viteEnv = readFileSync(join(root, 'src', 'vite-env.d.ts'), 'utf-8');
    const electronConfig = readJson(join(root, 'electron', 'capacitor.config.json'));

    expect(preloadAuto).toContain('"ExampleDesktopPlugin"');
    expect(preloadAuto).toContain('"echo"');
    expect(preloadAuto).toContain('"stateChanged"');
    expect(mainAuto).toContain('import { ExampleDesktopPlugin } from "@example/desktop-plugin/electron";');
    expect(mainAuto).toContain('registerPlugin("ExampleDesktopPlugin"');
    expect(countOccurrences(rootIndex, '<script src="/electron-init.js"></script>')).toBe(1);
    expect(viteEnv.startsWith('/// <reference types="@devioarts/capacitor-electron/globals" />\n')).toBe(true);
    expect(existsSync(join(root, 'public', 'electron-init.js'))).toBe(true);
    expect(existsSync(join(root, 'electron', 'assets', 'icon.png'))).toBe(true);
    expect(existsSync(join(root, 'electron', 'assets', 'tray.png'))).toBe(true);
    expect(existsSync(join(root, 'electron', 'assets', 'splash.svg'))).toBe(true);
    expect(electronConfig).toMatchObject({
      appId: 'com.example.desktop',
      appName: 'Example Desktop',
      webDir: 'www',
      plugins: {
        Electron: {
          browserWindow: { icon: 'icon.png' },
          ui: {
            trayMenu: { icon: 'tray.png' },
            splashScreen: { image: 'splash.svg' },
          },
        },
        ExampleDesktopPlugin: { enabled: true, mode: 'test' },
      },
    });

    runCli(root, ['update'], {
      CAPACITOR_CONFIG: JSON.stringify(capacitorConfig()),
    });

    expect(countOccurrences(readFileSync(join(root, 'index.html'), 'utf-8'), '<script src="/electron-init.js"></script>')).toBe(1);
    expect(countOccurrences(readFileSync(join(root, 'src', 'vite-env.d.ts'), 'utf-8'), '@devioarts/capacitor-electron/globals')).toBe(1);
  });

  it('sync --all composes copy, update, and package metadata synchronization', () => {
    const root = tempProject();

    const output = runCli(root, ['sync', '--all'], {
      CAPACITOR_CONFIG: JSON.stringify(capacitorConfig()),
    });

    const electronPackage = readJson(join(root, 'electron', 'package.json'));
    const electronLock = readJson(join(root, 'electron', 'package-lock.json'));

    expect(output).toContain('copy electron');
    expect(output).toContain('update electron');
    expect(output).toContain('sync electron');
    expect(existsSync(join(root, 'electron', 'app', 'index.html'))).toBe(true);
    expect(readJson(join(root, 'electron', 'capacitor.config.json'))).toMatchObject({
      appId: 'com.example.desktop',
      appName: 'Example Desktop',
    });
    expect(electronPackage).toMatchObject({
      name: 'root-app',
      productName: 'Example Desktop',
      version: '1.2.3',
      license: 'MIT',
    });
    expect(electronLock).toMatchObject({
      name: 'root-app',
      version: '1.2.3',
      packages: {
        '': { name: 'root-app', version: '1.2.3', license: 'MIT' },
      },
    });
  });

  it('sync still runs update when the copy step cannot find a built web directory', () => {
    const root = tempProject();
    rmSync(join(root, 'www'), { recursive: true, force: true });

    const output = runCli(root, ['sync'], {
      CAPACITOR_CONFIG: JSON.stringify(capacitorConfig()),
    });

    expect(output).toContain('copy step failed');
    expect(output).toContain('update electron');
    expect(existsSync(join(root, 'electron', 'capacitor.config.json'))).toBe(true);
    expect(existsSync(join(root, 'electron', 'app'))).toBe(false);
  });
});
