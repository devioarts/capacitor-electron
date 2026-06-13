# @devioarts/capacitor-electron

Capacitor platform plugin that adds Electron support to any Capacitor app. Provides a CLI (`cap-electron`) for scaffolding, syncing plugins, copying assets, and launching the app in development.

## Requirements

- Node.js ≥ 24
- Capacitor ≥ 8
- Electron 42

## Installation

```bash
npm install github:devioarts/capacitor-electron
```

Install a specific version:

```bash
npm install github:devioarts/capacitor-electron#v0.0.1
```

> The package is built automatically during install via the `prepare` script — no separate build step needed.

## Quick start

### 1. Add Electron to your Capacitor project

```bash
npx cap-electron add
```

Installs the `electron/` folder into your project, then automatically runs `sync` and `copy`.

### 2. Register helper scripts (optional)

```bash
npx cap-electron scripts
```

Adds `electron:sync`, `electron:copy`, `electron:open` to your root `package.json`.

### 3. Start developing

```bash
npx cap-electron open
```

Starts your Vite dev server (if not already running), builds the Electron app, and launches it in watch mode. Ctrl+C kills everything cleanly.

---

## Commands

| Command | Description |
|---|---|
| `cap-electron add` | Add Electron to the project — installs template, runs sync + copy |
| `cap-electron sync` | Scan installed plugins, generate IPC bridges, sync `capacitor.config` |
| `cap-electron copy` | Copy web build output to `electron/app/` |
| `cap-electron open` | Launch dev mode — starts dev server + Electron in watch mode |
| `cap-electron kill` | Kill all Electron/Node processes tied to this project |
| `cap-electron scripts` | Add `electron:*` helper scripts to root `package.json` |

---

## Configuration

Add an `Electron` block under `plugins` in `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';
import type { ElectronConfig } from '@devioarts/capacitor-electron';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'MyApp',
  webDir: 'dist',
  plugins: {
    Electron: {
      devUrl: 'http://localhost:5173',
      width: 1400,
      height: 900,
    } satisfies ElectronConfig,
  },
};

export default config;
```

### All options

| Option | Type | Default | Description |
|---|---|---|---|
| `devUrl` | `string` | `http://localhost:5173` | Dev server URL (`cap-electron open` uses this too) |
| `width` | `number` | `1200` | Initial window width in px |
| `height` | `number` | `800` | Initial window height in px |
| `minWidth` | `number` | — | Minimum window width |
| `minHeight` | `number` | — | Minimum window height |
| `fullscreen` | `boolean` | `false` | Start in fullscreen |
| `center` | `boolean` | `true` | Center window on startup |
| `resizable` | `boolean` | `true` | Allow window resizing |
| `alwaysOnTop` | `boolean` | `false` | Keep window above all others |
| `kiosk` | `boolean` | `false` | Kiosk mode — fullscreen, no system UI (ideal for POS/display apps) |
| `singleInstance` | `boolean` | `true` | Prevent more than one instance; second launch focuses the existing window |
| `frame` | `boolean` | `true` | Show native window frame and title bar (`false` = frameless) |
| `titleBarStyle` | `string` | — | macOS title bar style: `default`, `hidden`, `hiddenInset`, `customButtonsOnHover` |
| `autoHideMenuBar` | `boolean` | `false` | Auto-hide menu bar on Windows/Linux (press Alt to show) |
| `icon` | `string` | — | Path to window icon relative to `electron/` (e.g. `assets/icon.png`) |
| `openDevTools` | `boolean` | `true` in dev | Open DevTools on launch |
| `sandbox` | `boolean` | Electron default | Renderer process sandbox — leave unset unless a plugin requires Node.js access in the preload |

---

## Distribution

From the `electron/` directory:

```bash
npm run dist:mac    # macOS — x64 + arm64 DMG
npm run dist:win    # Windows — x64 NSIS installer
npm run dist:linux  # Linux — x64 AppImage
```

Place app icons in `electron/assets/`:
- `icon.icns` — macOS
- `icon.ico` — Windows
- `icon.png` — Linux

---

## Adding Electron support to a Capacitor plugin

See [ELECTRON_PLUGIN_GUIDE.md](ELECTRON_PLUGIN_GUIDE.md) for a step-by-step guide on how to add an `electron/` entry point to your plugin so that `cap-electron sync` picks it up automatically.

---

## License

[MIT](LICENSE)
