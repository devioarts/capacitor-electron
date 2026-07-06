import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const playgroundRoot = join(repoRoot, 'playground');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

run(npm, ['run', 'build'], repoRoot);

if (!existsSync(join(playgroundRoot, 'node_modules'))) {
  run(npm, ['ci'], playgroundRoot);
}

if (!existsSync(join(playgroundRoot, 'electron', 'package.json'))) {
  run(npx, ['cap-electron', 'add'], playgroundRoot);
}

run(npx, ['cap-electron', 'upgrade'], playgroundRoot);
run(npm, ['run', 'build:vite'], playgroundRoot);
run(npx, ['cap-electron', 'sync', '--all'], playgroundRoot, {
  CAPACITOR_CONFIG: JSON.stringify(e2eCapacitorConfig()),
});
run(npx, ['cap-electron', 'prepare'], playgroundRoot);

function e2eCapacitorConfig(): Record<string, unknown> {
  return {
    appId: 'com.devioarts.example.electron',
    appName: 'CapacitorJS Playground',
    webDir: 'dist',
    plugins: {
      Electron: {
        dev: {
          url: 'http://localhost:5173',
          openDevTools: false,
        },
        app: {
          deepLinkingScheme: 'capelectron',
          appLauncherSchemes: ['capelectron'],
        },
        browserWindow: {
          width: 1200,
          height: 800,
          center: true,
          icon: '/public/assets/icon.png',
        },
        security: {
          csp: false,
        },
        ui: {
          appMenu: {
            enabled: true,
            editMenu: false,
            viewMenu: true,
          },
          contextMenu: {
            enabled: true,
          },
          dockMenu: {
            enabled: true,
          },
          trayMenu: {
            enabled: false,
            minimizeToTray: false,
          },
        },
      },
    },
  };
}

function run(command: string, args: string[], cwd: string, env: Record<string, string> = {}): void {
  console.log(`[e2e:prepare] ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
}
