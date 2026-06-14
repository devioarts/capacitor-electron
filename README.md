# @devioarts/capacitor-electron

Capacitor platform plugin that adds Electron support to any Capacitor app. Provides a CLI (`cap-electron`) for scaffolding, syncing plugins, copying assets, and launching the app in development.

> **Early-stage project.** The API and behavior may change between releases. Use with caution in production environments. Bug reports, feature requests, and any other feedback are very welcome — please [open an issue](https://github.com/devioarts/capacitor-electron/issues).

## Requirements

- Node.js ≥ 24
- Capacitor ≥ 8
- Electron 42

## Installation

```bash
npm install --save-dev @devioarts/capacitor-electron
```

Pin to a specific version:

```bash
npm install --save-dev @devioarts/capacitor-electron@0.0.1
```

### Installing the latest unreleased version

To get changes that haven't been published to npm yet, install directly from GitHub:

```bash
npm install --save-dev github:devioarts/capacitor-electron
```

Or pin to a specific commit or branch:

```bash
npm install --save-dev github:devioarts/capacitor-electron#main
```

> The package is built automatically on install via the `prepare` script — no separate build step needed.
> Note: GitHub-hosted packages do not support `npm update`. Re-run the install command to get the latest.

### Updating

```bash
npm update @devioarts/capacitor-electron
```

After updating, run `cap-electron upgrade` (or `cap-electron restore`) to apply any changes to system files, then `cap-electron sync` to regenerate plugin bridges.

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

Adds `electron:sync`, `electron:copy` and `electron:open` to your root `package.json`.

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
| `cap-electron upgrade` / `restore` | Update system files from the installed package version — user files are never touched. Pass `--all` to also update `electron-builder.js` |

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
| `fullscreenable` | `boolean` | `true` | Allow fullscreen — enables the green button on macOS |
| `center` | `boolean` | `true` | Center window on startup |
| `resizable` | `boolean` | `true` | Allow window resizing |
| `alwaysOnTop` | `boolean` | `false` | Keep window above all others |
| `kiosk` | `boolean` | `false` | Kiosk mode — fullscreen, no system UI (ideal for POS/display apps) |
| `singleInstance` | `boolean` | `true` | Prevent more than one instance; second launch focuses the existing window |
| `frame` | `boolean` | `true` | Show native window frame and title bar (`false` = frameless) |
| `titleBarStyle` | `string` | — | macOS title bar style: `default`, `hidden`, `hiddenInset`, `customButtonsOnHover` |
| `autoHideMenuBar` | `boolean` | `false` | Auto-hide menu bar on Windows/Linux (press Alt to show) |
| `icon` | `string` | — | Path to the **window icon** (title bar, taskbar, Dock) relative to `electron/` (e.g. `assets/icon.png`) — see [docs/icons.md](docs/icons.md) |
| `openDevTools` | `boolean` | `true` in dev | Open DevTools on launch |
| `sandbox` | `boolean` | Electron default | Renderer process sandbox — leave unset unless a plugin requires Node.js access in the preload |
| `csp` | `string \| object \| false` | env default | Content Security Policy — see [docs/content-security-policy.md](docs/content-security-policy.md) |
| `persistWindowState` | `boolean` | `false` | Remember window size and position between launches — see [docs/window-state-persistence.md](docs/window-state-persistence.md) |
| `deepLinkingScheme` | `string` | — | Custom URL protocol for deep linking (e.g. `'myapp'` enables `myapp://`) — see [docs/deep-linking.md](docs/deep-linking.md) |
| `menu` | `false \| object` | Electron default | Native app menu — see [docs/app-menu.md](docs/app-menu.md) |
| `tray` | `object` | — | System tray icon and context menu — see [docs/tray-menu.md](docs/tray-menu.md) |
| `splashScreen` | `object` | — | Splash screen shown on startup — see [docs/splash-screen.md](docs/splash-screen.md) |
| `autoUpdater` | `object` | — | Auto-updater settings — see [docs/auto-updater.md](docs/auto-updater.md) |

---

## Built-in Capacitor plugin support

The following `@capacitor/*` plugins are implemented natively for Electron — install the plugin and it works without any extra configuration or IPC wiring.

### Local notifications

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

await LocalNotifications.schedule({
  notifications: [{ id: 1, title: 'Hello', body: 'Native desktop notification.' }],
});
```

See [docs/local-notifications.md](docs/local-notifications.md) for scheduling, events, and platform limitations.

### Dialog

```typescript
import { Dialog } from '@capacitor/dialog';

await Dialog.alert({ title: 'Notice', message: 'Operation complete.' });

const { value } = await Dialog.confirm({ title: 'Delete', message: 'Are you sure?' });
```

`alert` and `confirm` are native OS dialogs. `prompt` is not supported and always returns `{ value: '', cancelled: true }`. See [docs/dialog.md](docs/dialog.md).

### Action Sheet

```typescript
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';

const { index } = await ActionSheet.showActions({
  title: 'Choose an action',
  options: [
    { title: 'Edit' },
    { title: 'Delete', style: ActionSheetButtonStyle.Destructive },
    { title: 'Cancel', style: ActionSheetButtonStyle.Cancel },
  ],
});
```

Uses `dialog.showMessageBox` — a native OS dialog, not an HTML overlay. See [docs/action-sheet.md](docs/action-sheet.md).

### App

```typescript
import { App } from '@capacitor/app';

const { version } = await App.getInfo();

App.addListener('appStateChange', ({ isActive }) => {
  console.log('Window', isActive ? 'focused' : 'blurred');
});
```

Covers `getInfo`, `getState`, `exitApp`, `minimizeApp`, `getLaunchUrl`, and events `appStateChange`, `appUrlOpen`, `resume`, `pause`. See [docs/app.md](docs/app.md).

### Browser & App Launcher

```typescript
import { Browser } from '@capacitor/browser';
import { AppLauncher } from '@capacitor/app-launcher';

await Browser.open({ url: 'https://example.com' });
await AppLauncher.openUrl({ url: 'myotherapp://action/open' });
```

Both use `shell.openExternal`. See [docs/browser.md](docs/browser.md).

### Filesystem

```typescript
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

await Filesystem.writeFile({
  path: 'notes.txt',
  directory: Directory.Documents,
  data: 'Hello, Electron!',
  encoding: Encoding.UTF8,
});
```

Full read/write/copy/rename/download support via Node.js `fs/promises`. See [docs/filesystem.md](docs/filesystem.md) for directory mapping and all methods.

### Preferences

```typescript
import { Preferences } from '@capacitor/preferences';

await Preferences.set({ key: 'theme', value: 'dark' });
const { value } = await Preferences.get({ key: 'theme' });
```

Stored in `{userData}/preferences.json` — survives "Clear browsing data". See [docs/preferences.md](docs/preferences.md).

### Toast

```typescript
import { Toast } from '@capacitor/toast';

await Toast.show({ text: 'Saved.', duration: 'short' });
```

Uses the OS notification system (silent, auto-dismissed). See [docs/toast.md](docs/toast.md).

---

## `window.Electron` — system IPC

The template exposes a `window.Electron` bridge in the renderer (via the preload).

**TypeScript types are wired up automatically by `cap-electron sync`** — it writes a `/// <reference types="@devioarts/capacitor-electron/globals" />` directive into your `src/vite-env.d.ts` (or `src/env.d.ts`). No import needed in your app code.

If you ever need to add it manually:

```typescript
// src/vite-env.d.ts (or any ambient .d.ts included by your tsconfig)
/// <reference types="@devioarts/capacitor-electron/globals" />
```

| Method | Returns | Description |
|---|---|---|
| `quit()` | `Promise<void>` | Quit the app |
| `minimize()` | `Promise<void>` | Minimize the window |
| `maximize()` | `Promise<void>` | Maximize the window |
| `unmaximize()` | `Promise<void>` | Restore from maximized |
| `toggleMaximize()` | `Promise<void>` | Toggle maximize/restore |
| `isMaximized()` | `Promise<boolean>` | Returns true if window is maximized |
| `setFullscreen(flag)` | `Promise<void>` | Enter or exit fullscreen |
| `isFullscreen()` | `Promise<boolean>` | Returns true if in fullscreen |
| `focus()` | `Promise<void>` | Bring window to focus |
| `reload()` | `Promise<void>` | Reload the renderer |
| `openDevTools()` | `Promise<void>` | Open DevTools |
| `closeDevTools()` | `Promise<void>` | Close DevTools |
| `getAppVersion()` | `Promise<string>` | Returns `app.getVersion()` |

Usage example:

```typescript
await window.Electron.minimize();
const version = await window.Electron.getAppVersion();
```

---

## Window state persistence

Remember window size, position, and maximized state between launches:

```typescript
plugins: {
  Electron: {
    persistWindowState: true,
  },
},
```

State is written to `{userData}/window-state.json`. If a previously saved position falls outside all connected monitors (unplugged display), it is discarded and the window opens on the primary monitor instead.

See [docs/window-state-persistence.md](docs/window-state-persistence.md) for details.

---

## Deep linking

Register a custom URL protocol (`myapp://`) so the OS opens your app when the user clicks a matching link:

```typescript
plugins: {
  Electron: {
    deepLinkingScheme: 'myapp',
  },
},
```

```typescript
// Renderer
const unsub = window.Electron.onDeepLink?.(({ url }) => {
  console.log('Opened via deep link:', url);
});
```

See [docs/deep-linking.md](docs/deep-linking.md) for per-platform behaviour and macOS `electron-builder.js` setup.

---

## Global shortcuts

Register system-wide keyboard shortcuts that fire even when the app has no focus. Define them in `electron/src/user/shortcuts.ts`:

```typescript
export const shortcuts: GlobalShortcutDef[] = [
  { accelerator: 'CmdOrCtrl+Shift+K', event: 'open-search' },   // → renderer
  { accelerator: 'CmdOrCtrl+Shift+H', action: 'toggleWindow' },  // built-in action
];
```

Shortcuts can also be registered at runtime from the renderer via `window.Electron.registerShortcut()`.

See [docs/global-shortcuts.md](docs/global-shortcuts.md) for all variants, built-in actions, and the full renderer API.

---

## Tray menu

Show a system-tray icon. Enable in `capacitor.config.ts` and customise the context menu in `electron/src/user/tray.ts`:

```typescript
plugins: {
  Electron: {
    tray: {
      enabled: true,
      icon: 'assets/tray.png',
      tooltip: 'My App',
      minimizeToTray: true,  // hide to tray on close instead of quitting
    },
  },
},
```

See [docs/tray-menu.md](docs/tray-menu.md) for icon formats and context menu options.

---

## App menu

Configure the native menu bar:

```typescript
plugins: {
  Electron: {
    menu: false,           // hide the menu bar
    // or:
    menu: { editMenu: true, viewMenu: false },  // custom menu
  },
},
```

See [docs/app-menu.md](docs/app-menu.md) for platform differences and all options.

---

## Content Security Policy

CSP is applied automatically via response headers. In development a permissive policy is used (Vite HMR requires `unsafe-eval`). In production a strict policy is applied. Override when needed:

```typescript
plugins: {
  Electron: {
    csp: {
      'default-src': "'self'",
      'connect-src': ["'self'", 'https://api.example.com'],
    },
  },
},
```

See [docs/content-security-policy.md](docs/content-security-policy.md) for defaults, common scenarios, and how to disable.

---

## Auto-updater

Automatic updates via `electron-updater`. Only runs in production builds.

```typescript
plugins: {
  Electron: {
    autoUpdater: {
      enabled: true,
      channel: 'latest',
      autoDownload: true,
      autoInstallOnQuit: true,
    },
  },
},
```

```typescript
const unsub = window.Electron.updater.on('update-available', (info) => {
  console.log('New version:', info.version);
});

await window.Electron.updater.checkForUpdate();
```

See [docs/auto-updater.md](docs/auto-updater.md) for full API reference and setup instructions.

---

## Splash screen

A frameless window shown while the app is loading. Closes automatically when the renderer is ready.

```typescript
plugins: {
  Electron: {
    splashScreen: {
      image: 'assets/splash.png',
      width: 600,
      height: 400,
      backgroundColor: '#1a1a2e',
      minDisplayTime: 1500,
    },
  },
},
```

`image` is required — the splash screen is disabled when omitted. See [docs/splash-screen.md](docs/splash-screen.md) for all options.

---

## Distribution

From the `electron/` directory:

```bash
npm run dist:mac    # macOS — x64 + arm64 DMG
npm run dist:win    # Windows — x64 NSIS installer
npm run dist:linux  # Linux — x64 AppImage
```

Place `assets/icon.png` (**1024×1024** recommended) in `electron/assets/`.
electron-builder auto-converts it to `.icns` (macOS) and `.ico` (Windows).
For pre-built overrides add `assets/icon.icns` or `assets/icon.ico` — they take priority.

See [docs/icons.md](docs/icons.md) for details on window icon vs. bundle icon, platform behavior, and the Windows icon cache.

---

## Adding Electron support to a Capacitor plugin

See [ELECTRON_PLUGIN_GUIDE.md](ELECTRON_PLUGIN_GUIDE.md) for a step-by-step guide on how to add an `electron/` entry point to your plugin so that `cap-electron sync` picks it up automatically.

---

## Architecture

For a technical overview of how the IPC bridge, plugin system, hot-reload, and build pipeline work, see [docs/architecture.md](docs/architecture.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style, and how to submit changes.

---

## License

[MIT](LICENSE)
