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
npm install --save-dev @devioarts/capacitor-electron@0.1.1
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

After updating, run `npx cap-electron upgrade` (or `npx cap-electron restore`) to apply any changes to system files, then `npx cap-electron sync` to regenerate plugin bridges.

## Quick start

> **Why `npx cap-electron add` instead of `npx cap add electron`?**
> `npx cap add <platform>` resolves the platform by looking for a package named `@capacitor/<platform>` or `@capacitor-community/<platform>`. Because this package is published as `@devioarts/capacitor-electron`, the Capacitor CLI cannot find it that way. Use the dedicated `cap-electron` CLI instead.

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
| `npx cap-electron add` | Add Electron to the project — installs the template, then runs `update` and `copy` |
| `npx cap-electron scripts` | Add `electron:sync`, `electron:copy`, and `electron:open` helper scripts to root `package.json` |
| `npx cap-electron copy` | Copy the configured web build output (`webDir`) to `electron/app/` |
| `npx cap-electron update` | Regenerate Electron plugin bridges, inject global types, and write `electron/capacitor.config.json` |
| `npx cap-electron sync` | Run `copy`, then `update`; if `copy` fails, `update` still runs |
| `npx cap-electron run` | Launch dev mode — starts the web dev server when needed, builds/watches Electron, and hot-reloads |
| `npx cap-electron open` | Alias for `run` |
| `npx cap-electron build [mac\|win\|linux]` | Compile Electron sources and package with electron-builder. Defaults to the current OS when no platform is passed |
| `npx cap-electron kill` | Kill Electron/Node processes tied to this project |
| `npx cap-electron upgrade` | Update system files from the installed package version and run `update`; user files are not overwritten |
| `npx cap-electron restore` | Alias for `upgrade` |
| `npx cap-electron upgrade --all` | Also update `electron-builder.js`, `tsconfig.json`, and merge template `package.json` dependencies/scripts |

---

## Configuration

Electron configuration lives in the standard Capacitor plugin section:

```typescript
import { CapacitorConfig } from '@capacitor/cli';
import type { ElectronConfig } from '@devioarts/capacitor-electron';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'MyApp',
  webDir: 'dist',
  plugins: {
    Electron: {
      dev: {
        url: 'http://localhost:5173',
        openDevTools: true,
      },
      app: {
        serveMode: 'file',
        singleInstance: true,
        persistWindowState: true,
      },
      browserWindow: {
        width: 1400,
        height: 900,
        center: true,
        icon: '/public/assets/icon.png',
        webPreferences: {
          sandbox: true,
        },
      },
      security: {
        csp: {
          'default-src': "'self'",
          'connect-src': ["'self'", 'https://api.example.com'],
        },
      },
      ui: {
        appMenu: {
          enabled: true,
        },
        trayMenu: {
          enabled: true,
          icon: '/public/assets/tray.png',
          tooltip: 'MyApp',
        },
        splashScreen: {
          image: '/public/assets/splash.png',
          width: 600,
          height: 400,
        },
      },
      capacitorPlugins: {
        preferences: true,
      },
      builder: {
        win: {
          signExecutable: false,
        },
      },
    } satisfies ElectronConfig,
  },
};

export default config;
```

`cap-electron sync` writes a filtered runtime copy to `electron/capacitor.config.json`.
Project-root asset paths that start with `/` are copied into `electron/assets/` and rewritten to filenames in the generated config.

### Sections

| Option | Type | Default | Description |
|---|---|---|---|
| `dev` | object | — | Development workflow settings |
| `app` | object | — | Application lifecycle, serving mode, protocols, window state, and updater |
| `browserWindow` | object | — | Pass-through to Electron `BrowserWindowConstructorOptions` |
| `security` | object | — | Platform-managed security policy |
| `ui` | object | — | Native menu, tray, and splash screen helpers |
| `capacitorPlugins` | object | — | Switches for built-in Capacitor plugin implementations |
| `builder` | object | — | Deep-merged into the default `electron-builder` configuration |

### `dev`

| Option | Type | Default | Description |
|---|---|---|---|
| `dev.url` | `string` | `http://localhost:5173` | Dev server URL used by `cap-electron run` |
| `dev.openDevTools` | `boolean` | `true` in dev, `false` in prod | Open DevTools when the main window launches |

### `app`

| Option | Type | Default | Description |
|---|---|---|---|
| `app.serveMode` | `'file' \| 'server'` | `'file'` | Production serving mode. Use `'server'` for Web APIs that require an HTTP origin |
| `app.singleInstance` | `boolean` | `true` | Prevent more than one instance; second launch focuses the existing window |
| `app.persistWindowState` | `boolean` | `false` | Remember window size and position between launches |
| `app.deepLinkingScheme` | `string` | — | Custom URL protocol for deep linking, e.g. `'myapp'` for `myapp://` |
| `app.appLauncherSchemes` | `string[]` | — | Extra URL schemes allowed for `@capacitor/app-launcher` |
| `app.autoUpdater` | object | — | `electron-updater` settings |

See [window state](docs/window-state-persistence.md), [deep linking](docs/deep-linking.md), [browser/app launcher](docs/browser.md), and [auto-updater](docs/auto-updater.md).

### `browserWindow`

`browserWindow` is passed to `new BrowserWindow(...)`, so Electron's normal window options are supported:

```typescript
plugins: {
  Electron: {
    browserWindow: {
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      center: true,
      titleBarStyle: 'hiddenInset',
      autoHideMenuBar: true,
      icon: '/public/assets/icon.png',
      webPreferences: {
        sandbox: true,
      },
    },
  },
},
```

The platform always enforces these values for the main window:

```typescript
webPreferences: {
  preload: '<managed by capacitor-electron>',
  contextIsolation: true,
  nodeIntegration: false,
}
```

They are intentionally not configurable, because the preload bridge and security model depend on them.

### `security`

| Option | Type | Default | Description |
|---|---|---|---|
| `security.csp` | `string \| Record<string, string \| string[]> \| false` | environment default | Content Security Policy injected via response headers |

See [content security policy](docs/content-security-policy.md).

### `ui`

| Option | Type | Default | Description |
|---|---|---|---|
| `ui.appMenu` | object | Electron default | Set `enabled: true` to read `electron/src/user/menu/app.ts`; if it returns `null`, use the built-in preset |
| `ui.contextMenu` | object | disabled | Set `enabled: true` to read `electron/src/user/menu/context.ts` |
| `ui.trayMenu` | object | disabled | Set `enabled: true` to create the tray icon and read `electron/src/user/menu/tray.ts` |
| `ui.splashScreen` | object | disabled | Splash screen shown while the app loads |
| `ui.dockMenu` | object | disabled | Set `enabled: true` to read `electron/src/user/menu/dock.ts`; also supports hiding the macOS Dock icon |

See [native menus](docs/menus.md), [tray menu](docs/tray-menu.md), and [splash screen](docs/splash-screen.md).

### `capacitorPlugins`

| Option | Type | Default | Description |
|---|---|---|---|
| `capacitorPlugins.preferences` | `boolean` | `true` | Native `@capacitor/preferences` bridge. Set `false` to use the plugin's web/localStorage fallback |

### `builder`

`builder` is deep-merged into the template's default `electron-builder` configuration. This lets you keep the default packaging behavior while overriding any builder option:

```typescript
plugins: {
  Electron: {
    builder: {
      appId: 'com.example.myapp.desktop',
      productName: 'MyApp',
      publish: {
        provider: 'github',
        owner: 'your-org',
        repo: 'your-repo',
      },
      mac: {
        category: 'public.app-category.productivity',
      },
      win: {
        target: [{ target: 'nsis', arch: ['x64', 'arm64'] }],
      },
      nsis: {
        oneClick: false,
      },
    },
  },
},
```

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

### Clipboard

```typescript
import { Clipboard } from '@capacitor/clipboard';

await Clipboard.write({ string: 'Copied from Electron.' });
const { value } = await Clipboard.read();
```

Supports text, URL text, and image data URLs through Electron's native clipboard. See [docs/clipboard.md](docs/clipboard.md).

### Device

```typescript
import { Device } from '@capacitor/device';

const info = await Device.getInfo();
const id = await Device.getId();
```

Returns desktop OS, architecture, app-specific install id, locale, and WebView/Chrome version. See [docs/device.md](docs/device.md).

### Network

```typescript
import { Network } from '@capacitor/network';

const status = await Network.getStatus();
```

Reports online/offline state and emits `networkStatusChange`; desktop connection type is usually `unknown`. See [docs/network.md](docs/network.md).

### File Viewer

```typescript
import { FileViewer } from '@capacitor/file-viewer';

await FileViewer.openDocumentFromLocalPath({ path: '/absolute/path/report.pdf' });
```

Opens local files and URLs with the OS default application. See [docs/file-viewer.md](docs/file-viewer.md).

### File Transfer

```typescript
import { FileTransfer } from '@capacitor/file-transfer';

await FileTransfer.downloadFile({ url: 'https://example.com/file.zip', path: 'file:///tmp/file.zip', progress: true });
```

Supports download, upload, and `progress` events. See [docs/file-transfer.md](docs/file-transfer.md).

### Privacy Screen

```typescript
import { PrivacyScreen } from '@capacitor/privacy-screen';

await PrivacyScreen.enable();
```

Uses Electron content protection where the OS supports it. See [docs/privacy-screen.md](docs/privacy-screen.md) for limitations.

### Preferences

```typescript
import { Preferences } from '@capacitor/preferences';

await Preferences.set({ key: 'theme', value: 'dark' });
const { value } = await Preferences.get({ key: 'theme' });
```

Stored in `{userData}/CapacitorStorage/{appId}/preferences.json` — survives "Clear browsing data". See [docs/preferences.md](docs/preferences.md).

Switching from the web/localStorage fallback to the native bridge? Call `Preferences.migrate()` once to copy `CapacitorStorage.*` and legacy `_cap_*` localStorage keys into the JSON file without overwriting existing native values.

Prefer the web/localStorage fallback instead:

```typescript
plugins: {
  Electron: {
    capacitorPlugins: {
      preferences: false,
    },
  },
}
```

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
| `showContextMenu(options?)` | `Promise<boolean>` | Show the configured native context menu from renderer code |
| `onMenuAction(callback)` | `() => void` | Subscribe to actions emitted by native app/context/dock/tray menus |
| `startPowerSaveBlocker(type)` | `Promise<number>` | Prevent app suspension or display sleep |
| `stopPowerSaveBlocker(id)` | `Promise<boolean>` | Stop a previously started power save blocker |
| `isPowerSaveBlockerStarted(id)` | `Promise<boolean>` | Check whether a blocker id is active |

Additional desktop namespaces are exposed under `window.Electron`:

| Namespace | Description |
|---|---|
| `dialogs` | Native open/save/message/error dialogs |
| `secureStorage` | Encrypted local key-value storage via Electron `safeStorage` |
| `protocols` | Configured protocol/default-client helpers |
| `session` | Cache, storage, cookies, proxy, user agent |
| `downloads` | Electron download manager with progress events |
| `print` | Native print, printer list, and PDF export |
| `desktopCapture` | Screen/window capture source listing |
| `autoLaunch` | Login item / start-at-login settings |
| `nativeTheme` | System theme state and theme source override |
| `windows` | Managed secondary windows |

See [docs/electron-desktop-apis.md](docs/electron-desktop-apis.md) for the full desktop API surface.

Usage example:

```typescript
await window.Electron.minimize();
const version = await window.Electron.getAppVersion();
```

Power save blocker example:

```typescript
const id = await window.Electron.startPowerSaveBlocker('prevent-display-sleep');

// Later, when the long-running task or presentation ends:
await window.Electron.stopPowerSaveBlocker(id);
```

See [docs/power-save-blocker.md](docs/power-save-blocker.md) for details.

---

## Window state persistence

Remember window size, position, and maximized state between launches:

```typescript
plugins: {
  Electron: {
    app: {
      persistWindowState: true,
    },
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
    app: {
      deepLinkingScheme: 'myapp',
    },
  },
},
```

```typescript
// Renderer
const unsub = window.Electron.onDeepLink?.(({ url }) => {
  console.log('Opened via deep link:', url);
});
```

See [docs/deep-linking.md](docs/deep-linking.md) for per-platform behaviour and macOS `builder` setup.

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

Show a system-tray icon. Enable in `capacitor.config.ts` and customise the context menu in `electron/src/user/menu/tray.ts`:

```typescript
plugins: {
  Electron: {
    ui: {
      trayMenu: {
        enabled: true,
        icon: 'tray.png',
        tooltip: 'My App',
        minimizeToTray: true,  // hide to tray on close instead of quitting
      },
    },
  },
},
```

See [docs/tray-menu.md](docs/tray-menu.md) for icon formats and context menu options.

---

## Native menus

Application, context, Dock, and tray menus are user-owned files under `electron/src/user/menu/`. Use config only to enable the surface or select the simple preset:

```typescript
plugins: {
  Electron: {
    ui: {
      appMenu: {
        enabled: true,
      },
      contextMenu: {
        enabled: true,
      },
      dockMenu: {
        enabled: true,
      },
    },
  },
},
```

See [docs/menus.md](docs/menus.md) for application, context, Dock, and tray menu details.

---

## Content Security Policy

CSP is applied automatically via response headers. In development a permissive policy is used (Vite HMR requires `unsafe-eval`). In production a strict policy is applied. Override when needed:

```typescript
plugins: {
  Electron: {
    security: {
      csp: {
        'default-src': "'self'",
        'connect-src': ["'self'", 'https://api.example.com'],
      },
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
    app: {
      autoUpdater: {
        enabled: true,
        channel: 'latest',
        autoDownload: true,
        autoInstallOnQuit: true,
      },
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
    ui: {
      splashScreen: {
        image: 'splash.png',
        width: 600,
        height: 400,
        backgroundColor: '#1a1a2e',
        minDisplayTime: 1500,
      },
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

Use `plugins.Electron.builder` when you need to override electron-builder settings such as targets, signing, publish providers, artifact names, or platform metadata.

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
