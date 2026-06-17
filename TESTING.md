# Feature Testing Tracker

> Version: **0.1.1** | Updated: 2026-06-17

## Legend
- ✅ Tested and working
- ❌ Not tested / failed
- ⚠️ Partially tested / issues found
- 🚧 In progress / not complete
- — Not applicable / unknown

**Platforms:** `arm` = macOS Apple Silicon · `win` = Windows · `lin` = Linux

---

## CLI Commands

| Feature | Description | arm | win | lin | Notes |
|---------|-------------|-----|-----|-----|-------|
| `add`<br><sub>Installs the Electron template, patches package metadata, runs `update`, then attempts `copy`</sub> | Add Electron platform to a project | ✅ | ✅ | — | |
| `scripts`<br><sub>Adds `electron:sync`, `electron:copy`, and `electron:open` to root `package.json` without overwriting existing scripts</sub> | Add helper npm scripts | ✅ | ✅ | — | |
| `copy`<br><sub>Copies configured `webDir` into `electron/app/` and injects `electron-init.js` into the copied app</sub> | Copy web assets into the Electron project | ✅ | ✅ | — | |
| `update`<br><sub>Generates plugin bridges, injects global types, syncs config, and normalizes Electron asset paths</sub> | Update generated Electron files | ✅ | ✅ | — | |
| `sync`<br><sub>Runs `copy`, then `update`; if `copy` fails, `update` still runs</sub> | Copy and update in one command | ❌ | ❌ | — | Not tested as a standalone command |
| `run`<br><sub>Starts dev server when needed, builds/watches Electron, launches Electron, restarts main, reloads renderer</sub> | Run development workflow | ⚠️ | ⚠️ | — | Process cleanup on Ctrl+C |
| `open`<br><sub>Alias for `run`</sub> | Run development workflow alias | ⚠️ | ⚠️ | — | Alias path should be retested separately |
| `build [mac/win/linux]`<br><sub>Compiles Electron sources and packages with electron-builder; defaults to current OS</sub> | Build distributable packages | ⚠️ | ⚠️ | — | Installer issue |
| `kill`<br><sub>Finds and terminates Node/Electron processes tied to the project root</sub> | Kill project Electron processes | ✅ | ✅ | — | |
| `upgrade`<br><sub>Updates system files from the installed template, preserves user files, cleans generated files, then runs `update`</sub> | Upgrade system files | ✅ | ✅ | — | |
| `restore`<br><sub>Alias for `upgrade`</sub> | Restore system files alias | ❌ | ❌ | — | Not tested as a standalone command |
| `upgrade --all`<br><sub>Also updates `electron-builder.js`, `tsconfig.json`, and merges template package dependencies/scripts</sub> | Upgrade optional system files | ❌ | ❌ | — | Not tested separately |

---

## Capacitor Plugins / API

| Feature | Docs | arm | win | lin | Notes |
|---------|------|-----|-----|-----|-------|
| App (lifecycle)<br><sub>getInfo, getState, exitApp, minimizeApp, getLaunchUrl; events: appStateChange / resume / pause / appUrlOpen</sub> | [app.md](docs/app.md) | ✅ | ✅ | — | |
| Action Sheet<br><sub>showActions() — modal list of buttons the user can pick from</sub> | [action-sheet.md](docs/action-sheet.md) | ✅ | ✅ | — | |
| App Launcher<br><sub>canOpenUrl() — checks whether the OS can open a URL; openUrl() — opens it in the default app/browser</sub> | — | ❌ | ❌ | — | Not tested |
| App Menu<br><sub>Native application menu bar configured via `menu` in capacitor.config; editMenu, viewMenu options</sub> | [app-menu.md](docs/app-menu.md) | ❌ | ✅ | — | Mac not work |
| Auto Updater<br><sub>electron-updater: checkForUpdate, download, quitAndInstall; latest/beta/alpha channels</sub> | [auto-updater.md](docs/auto-updater.md) | ❌ | ❌ | — | Not tested |
| Browser (InAppBrowser)<br><sub>open() — opens URL in the default OS browser via `shell.openExternal`; close() — no-op; getSnapshot() — returns null</sub> | [browser.md](docs/browser.md) | ❌ | ❌ | — | Not tested |
| Dialog<br><sub>alert(), confirm(), prompt() — native Electron dialogs (no file dialogs)</sub> | [dialog.md](docs/dialog.md) | ✅ | ✅ | — | |
| Filesystem<br><sub>readFile, writeFile, mkdir, readdir, stat, rename, copy, downloadFile; Capacitor directory mapping to OS paths</sub> | [filesystem.md](docs/filesystem.md) | ✅ | ✅ | — | |
| Global Shortcuts<br><sub>Register shortcuts in main.ts or at runtime from the renderer via registerShortcut/unregisterShortcut; onShortcut callback</sub> | [global-shortcuts.md](docs/global-shortcuts.md) | ✅ | ✅ | — | |
| Local Notifications<br><sub>schedule, cancel, getPending; checkPermissions/requestPermissions; action types and channels</sub> | [local-notifications.md](docs/local-notifications.md) | ❌ | ✅⚠️ | — | On Windows caption shows "Electron" |
| Preferences<br><sub>get, set, remove, clear, keys — persistent key-value store written to a JSON file in appData</sub> | [preferences.md](docs/preferences.md) | ✅ | ✅ | — | |
| Splash Screen<br><sub>Splash window shown before the main app loads; minDisplayTime, backgroundColor, dimensions</sub> | [splash-screen.md](docs/splash-screen.md) | ✅ | ✅ | — | |
| Toast<br><sub>show() — short overlay message in the window; position top/center/bottom, duration short/long</sub> | [toast.md](docs/toast.md) | ❌ | ✅ | — | Not tested on Mac |
| Tray Menu<br><sub>System tray icon; context menu; minimizeToTray — hide window to tray instead of quitting on close</sub> | [tray-menu.md](docs/tray-menu.md) | ❌ | ✅⚠️ | — | On Windows no icon |
| Window State Persistence<br><sub>Save and restore window position and size between launches; persistWindowState in config</sub> | [window-state-persistence.md](docs/window-state-persistence.md) | ✅ | ❌ | — | Windows - not working |

---

## Electron Bridge (`window.Electron`)

| Feature | arm | win | lin | Notes |
|---------|-----|-----|-----|-------|
| Window controls<br><sub>minimize, maximize, unmaximize, toggleMaximize, isMaximized — called from the renderer over IPC</sub> | ✅ | ✅ | — | |
| Fullscreen<br><sub>setFullscreen(true/false), isFullscreen() — enter/exit fullscreen and query current state</sub> | ✅ | ✅ | — | |
| App controls<br><sub>quit(), focus(), reload() — quit the app, focus the window, reload the renderer programmatically</sub> | ✅ | ✅ | — | |
| DevTools<br><sub>openDevTools(), closeDevTools() — open/close Electron DevTools programmatically</sub> | ✅ | ✅ | — | |
| getAppVersion<br><sub>Returns the app version from package.json via `ipcRenderer.invoke("system:getAppVersion")`</sub> | ✅ | ✅ | — | |
| Power Save Blocker<br><sub>startPowerSaveBlocker(type), stopPowerSaveBlocker(id), isPowerSaveBlockerStarted(id)</sub> | ❌ | ❌ | — | Not tested |
| Badge count<br><sub>setBadgeCount(n), getBadgeCount() — badge on the Dock icon (macOS) or taskbar (Windows)</sub> | ❌ | ❌ | — | Not tested |
| Power Monitor<br><sub>onPowerMonitorEvent (suspend/resume/lock-screen…), getSystemIdleState, getSystemIdleTime</sub> | ❌ | ❌ | — | Not tested |
| Screen / Display<br><sub>getAllDisplays, getPrimaryDisplay, getCursorScreenPoint; onScreenEvent (display-added/removed/metrics-changed)</sub> | ❌ | ❌ | — | Not tested |

---

## Configuration & Infrastructure

| Feature | Docs | arm | win | lin | Notes |
|---------|------|-----|-----|-----|-------|
| Deep Linking<br><sub>Register a URL scheme (myapp://) via deepLinkingScheme; cold start + running instance + window.Electron.onDeepLink</sub> | [deep-linking.md](docs/deep-linking.md) | ✅ | ✅ | — | |
| Content Security Policy<br><sub>CSP headers for BrowserWindow; string / object / false via `csp` in config; sensible defaults in prod</sub> | [content-security-policy.md](docs/content-security-policy.md) | ✅ | ✅ | — | |
| Icons & Assets<br><sub>icon.png → .icns/.ico via electron-builder; runtime window and Dock icon via `icon` in config</sub> | [icons.md](docs/icons.md) | ❌ | ❌ | — | Not tested |
| Project-root asset paths<br><sub>Leading-slash config paths for `icon`, `tray.icon`, and `splashScreen.image` copy from project root into `electron/assets/` and rewrite generated config</sub> | [icons.md](docs/icons.md) | ✅ | ❌ | — | Tested via isolated CLI update run on macOS |
| Plugin Settings (shared)<br><sub>Plugin configuration via plugins.Electron in capacitor.config.ts; read via getElectronConfig() in main</sub> | — | ✅ | ✅ | — | |
| serveMode: 'server'<br><sub>Embedded HTTP server on 127.0.0.1 (random port) instead of file://; required for WebUSB / WebBluetooth</sub> | — | ❌ | ❌ | — | Not tested |
| singleInstance<br><sub>Single instance lock — second launch focuses the existing window; required for Windows deep linking</sub> | — | ✅ | ✅ | — | |
| Vite build integration<br><sub>devUrl from capacitor.config; Electron hot-restart on main.cjs change, renderer reload on preload.cjs change</sub> | — | ✅ | ✅ | — | |
| electron-builder configuration<br><sub>Build installers: .dmg (macOS), .exe NSIS (Windows), .AppImage (Linux); code signing</sub> | — | ❌ | ❌ | — | Not tested |
| Preload script<br><sub>contextBridge exposes window.Electron and window._CapElectron to the renderer; sandbox compatibility</sub> | — | ✅ | ✅ | — | |
| IPC bridge (main ↔ renderer)<br><sub>ipcMain.handle + ipcRenderer.invoke for plugin calls; nativeCallback for event streaming</sub> | — | ✅ | ✅ | — | |

---

## Template: New Project

| Feature | arm | win | lin | Notes |
|---------|-----|-----|-----|-------|
| `template-electron` generation<br><sub>Creates `electron/` with full file structure, tsconfig, package.json and default capacitor.config</sub> | ✅ | ✅ | — | |
| `template-plugin` generation<br><sub>Creates an Electron plugin template with correct structure and exports</sub> | ❌ | ❌ | — | Not tested |
| Generated project structure<br><sub>Correctness of generated files — src/system/ vs src/user/ split, build outputs in dist/</sub> | ✅ | ✅ | — | |
| Hot reload in development<br><sub>Electron auto-restarts on main.cjs change; renderer reloads on preload.cjs change (via .dev-reload signal)</sub> | ✅ | ❌ | — | Not tested on Windows |
| Production build & packaging<br><sub>npm run build in electron/; electron-builder assembles the installer; launch and verify it works</sub> | ⚠️ | ⚠️ | — | Installer issue |
