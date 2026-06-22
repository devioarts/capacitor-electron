import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  collectElectronPackageMetadata,
  syncElectronPackageMetadata,
} from '../../src/cli/metadata.js';

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'cap-electron-metadata-'));
  tempDirs.push(dir);
  return dir;
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>;
}

describe('collectElectronPackageMetadata', () => {
  it('uses Capacitor identity and root package metadata', () => {
    const root = tempProject();
    writeFileSync(join(root, 'capacitor.config.json'), JSON.stringify({
      appId: 'com.example.desktop',
      appName: 'Example Desktop',
    }));
    writeFileSync(join(root, 'package.json'), JSON.stringify({
      name: 'example-root',
      version: '1.2.3',
      description: 'Example app',
      author: { name: 'Example Inc', email: 'dev@example.com' },
      homepage: 'https://example.com',
      license: 'MIT',
      repository: { type: 'git', url: 'https://example.com/repo.git' },
      bugs: { url: 'https://example.com/issues' },
    }));

    expect(collectElectronPackageMetadata(root)).toEqual({
      appMeta: { appId: 'com.example.desktop', appName: 'Example Desktop' },
      packageName: 'example-root',
      packageJson: {
        name: 'example-root',
        productName: 'Example Desktop',
        desktopName: 'example-root',
        version: '1.2.3',
        description: 'Example app',
        author: { name: 'Example Inc', email: 'dev@example.com' },
        homepage: 'https://example.com',
        license: 'MIT',
        repository: { type: 'git', url: 'https://example.com/repo.git' },
        bugs: { url: 'https://example.com/issues' },
      },
    });
  });

  it('prefers appName when the root package name is generic app', () => {
    const root = tempProject();
    writeFileSync(join(root, 'capacitor.config.json'), JSON.stringify({
      appId: 'com.example.tofik',
      appName: 'Tofík',
    }));
    writeFileSync(join(root, 'package.json'), JSON.stringify({
      name: 'app',
      version: '1.0.0',
    }));

    expect(collectElectronPackageMetadata(root)).toMatchObject({
      appMeta: { appId: 'com.example.tofik', appName: 'Tofík' },
      packageName: 'tofik',
      packageJson: {
        name: 'tofik',
        productName: 'Tofík',
        desktopName: 'tofik',
      },
    });
  });
});

describe('syncElectronPackageMetadata', () => {
  it('updates electron package.json and package-lock root metadata', () => {
    const root = tempProject();
    mkdirSync(join(root, 'electron'));

    writeFileSync(join(root, 'capacitor.config.json'), JSON.stringify({
      appId: 'com.example.app',
      appName: 'Example App',
    }));
    writeFileSync(join(root, 'package.json'), JSON.stringify({
      name: 'example-app',
      version: '2.0.0',
      license: 'Apache-2.0',
      homepage: 'https://example.com',
    }));
    writeFileSync(join(root, 'electron', 'package.json'), JSON.stringify({
      name: 'old',
      version: '0.0.1',
      type: 'commonjs',
      scripts: { build: 'echo build' },
    }));
    writeFileSync(join(root, 'electron', 'package-lock.json'), JSON.stringify({
      name: 'old',
      version: '0.0.1',
      lockfileVersion: 3,
      packages: {
        '': { name: 'old', version: '0.0.1', license: 'UNLICENSED' },
      },
    }));

    const changed = syncElectronPackageMetadata(
      root,
      join(root, 'electron', 'package.json'),
      join(root, 'electron', 'package-lock.json'),
    );

    expect(changed).toBe(true);
    expect(readJson(join(root, 'electron', 'package.json'))).toMatchObject({
      name: 'example-app',
      productName: 'Example App',
      desktopName: 'example-app',
      version: '2.0.0',
      license: 'Apache-2.0',
      homepage: 'https://example.com',
      type: 'commonjs',
      scripts: { build: 'echo build' },
    });
    expect(readJson(join(root, 'electron', 'package-lock.json'))).toMatchObject({
      name: 'example-app',
      version: '2.0.0',
      packages: {
        '': { name: 'example-app', version: '2.0.0', license: 'Apache-2.0' },
      },
    });
  });
});
