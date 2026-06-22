# Platform and OS support

This page describes the desktop operating systems supported by the built-in
Capacitor plugin implementations and by the `window.Electron` desktop bridge.

The support matrix is based on the current implementation in `src/template-electron/src/system/static`.
`Yes` means the API is implemented for that OS through Electron or Node.js. `Partial` means the
method exists, but OS behavior or this implementation limits part of the contract.

Official API references:

- Capacitor APIs: [App](https://capacitorjs.com/docs/apis/app), [Action Sheet](https://capacitorjs.com/docs/apis/action-sheet), [Browser](https://capacitorjs.com/docs/apis/browser), [Clipboard](https://capacitorjs.com/docs/apis/clipboard), [Device](https://capacitorjs.com/docs/apis/device), [Dialog](https://capacitorjs.com/docs/apis/dialog), [Filesystem](https://capacitorjs.com/docs/apis/filesystem), [Local Notifications](https://capacitorjs.com/docs/apis/local-notifications), [Network](https://capacitorjs.com/docs/apis/network), [Preferences](https://capacitorjs.com/docs/apis/preferences), [Toast](https://capacitorjs.com/docs/apis/toast), [File Transfer](https://capacitorjs.com/docs/apis/file-transfer), [App Launcher](https://capacitorjs.com/docs/apis/app-launcher), and [InAppBrowser](https://capacitorjs.com/docs/apis/inappbrowser).
- Electron APIs: [BrowserWindow](https://electronjs.org/docs/latest/api/browser-window), [dialog](https://electronjs.org/docs/latest/api/dialog), [shell](https://electronjs.org/docs/latest/api/shell), [Notification](https://electronjs.org/docs/latest/api/notification), [safeStorage](https://electronjs.org/docs/latest/api/safe-storage), [globalShortcut](https://electronjs.org/docs/latest/api/global-shortcut), [powerSaveBlocker](https://electronjs.org/docs/latest/api/power-save-blocker), [powerMonitor](https://electronjs.org/docs/latest/api/power-monitor), [desktopCapturer](https://electronjs.org/docs/latest/api/desktop-capturer), [screen](https://electronjs.org/docs/latest/api/screen), and [session](https://electronjs.org/docs/latest/api/session).

## Built-in Capacitor plugins

| Plugin / method | macOS | Windows | Linux | Notes |
|---|---:|---:|---:|---|
| `ActionSheet.showActions()` | Yes | Yes | Yes | Native Electron message box. Destructive styling is textual only. |
| `App.getInfo()`, `getState()`, `exitApp()`, `minimizeApp()`, `getAppLanguage()` | Yes | Yes | Yes | `minimizeApp()` maps to the focused Electron window. |
| `App.getLaunchUrl()` | Yes | Yes | Partial | macOS and Windows cold-start deep links are captured once. Linux is supported when the desktop entry passes the URL in `argv`. |
| `App` focus events (`appStateChange`, `resume`, `pause`) | Yes | Yes | Yes | Driven by Electron `BrowserWindow` focus/blur. |
| `App.appUrlOpen` | Yes | Yes | Partial | Linux links can arrive via `argv`/`second-instance`; desktop entry registration controls whether the OS passes the URL. |
| `App.toggleBackButtonHandler()`, `backButton`, `appRestoredResult` | No-op | No-op | No-op | Android-only behavior with no desktop equivalent. |
| `Browser.open()`, `close()` | Yes | Yes | Yes | Opens an Electron-owned web window for `http`/`https` URLs. |
| `InAppBrowser.openInExternalBrowser()` | Yes | Yes | Yes | Uses `shell.openExternal()` for `http`/`https` URLs. |
| `InAppBrowser.openInSystemBrowser()` | Yes | Yes | Yes | Same Electron behavior as external browser mode. |
| `InAppBrowser.openInWebView()` | Yes | Yes | Yes | Uses `BrowserWindow` plus `WebContentsView`; mobile-only options are ignored. |
| `AppLauncher.canOpenUrl()` | Partial | Partial | Partial | Checks local scheme policy only, not whether another app is installed. |
| `AppLauncher.openUrl()` | Yes | Yes | Yes | Allows `http`, `https`, and configured custom schemes. |
| `Filesystem.checkPermissions()` / `requestPermissions()` | Yes | Yes | Yes | Return `publicStorage: 'granted'`; no desktop permission prompt is shown. |
| `Filesystem` file operations | Yes | Yes | Yes | Uses Node.js filesystem APIs and Electron `app.getPath()`. |
| `Filesystem.downloadFile()` | Yes | Yes | Yes | Uses runtime `fetch`; supports `http`/`https`. |
| `Filesystem.readFileInChunks()` | No | No | No | Requires a method-specific callback bridge, not just a main-process file reader. |
| `Filesystem.addListener('progress')` | No | No | No | Deprecated upstream for `Filesystem.downloadFile()`; use `@capacitor/file-transfer` progress events. |
| `Clipboard.write()` / `read()` | Yes | Yes | Yes | Text and image data URLs use Electron clipboard APIs. |
| `Device` methods | Yes | Yes | Yes | Linux reports `operatingSystem: 'unknown'` because Capacitor has no Linux enum value. |
| `Dialog.alert()` / `confirm()` | Yes | Yes | Yes | Native message boxes. |
| `Dialog.prompt()` | No | No | No | Always returns `{ value: '', cancelled: true }`. |
| `FileTransfer.downloadFile()` / `uploadFile()` | Yes | Yes | Yes | Uses Node.js streams and `fetch`; progress is emitted from the main process. |
| `FileViewer` open/preview methods | Yes | Yes | Yes | Uses OS file associations via Electron `shell`. |
| `LocalNotifications.schedule()` | Partial | Partial | Partial | Uses Electron `Notification`; delivery is not persisted across restarts. |
| `LocalNotifications` Android channel/exact-alarm methods | Stub | Stub | Stub | Present for API compatibility only. |
| `Network.getStatus()` / `networkStatusChange` | Yes | Yes | Yes | Uses Chromium online status; connection type is `unknown` when online. |
| `Preferences` methods | Yes | Yes | Yes | Stored in a JSON file under Electron `userData`. |
| `PrivacyScreen` methods | Partial | Partial | Partial | Uses `BrowserWindow.setContentProtection()`; OS/window-manager capture behavior can vary. |
| `Toast.show()` | Partial | Partial | Partial | Uses Electron `Notification`; unsigned macOS builds and headless Linux may not show notifications. |

## `window.Electron` bridge

| Namespace / method group | macOS | Windows | Linux | Notes |
|---|---:|---:|---:|---|
| Window controls (`minimize`, `maximize`, `fullscreen`, etc.) | Yes | Yes | Yes | Act on the sender window. |
| Badge count | Yes | Partial | Partial | Delegates to `app.setBadgeCount()` / `getBadgeCount()`; unsupported platforms return Electron's result. |
| `dialogs` | Yes | Yes | Yes | Native open/save/message/error dialogs. |
| `secureStorage` | Yes | Yes | Partial | Values use Electron `safeStorage`; JSON key names can be plain or hashed. Linux availability depends on the desktop secret storage backend. |
| `protocols` | Yes | Yes | Partial | Registration uses Electron protocol APIs; Linux cold-start app routing depends on desktop integration. |
| `session` | Yes | Yes | Yes | Wraps the sender window's Electron session. |
| `downloads` | Yes | Yes | Yes | Uses Electron `will-download` and `DownloadItem`. |
| `print` / `printToPDF` | Yes | Yes | Yes | Printer availability is OS/environment dependent. |
| `desktopCapture` | Partial | Partial | Partial | OS screen-recording permissions and window manager behavior apply. |
| `autoLaunch` | Yes | Yes | No | Linux returns `false`; create a desktop-environment autostart entry manually. |
| `nativeTheme` | Yes | Yes | Yes | Depends on Electron `nativeTheme` support in the current OS theme environment. |
| `windows` | Yes | Yes | Yes | Managed secondary windows; renderer-created URLs are limited to `http`/`https`. |
| `onDeepLink()` | Yes | Yes | Partial | Same platform notes as `App.appUrlOpen`. |
| Global shortcuts | Yes | Yes | Yes | Uses Electron `globalShortcut`; availability can depend on OS-reserved accelerators. |
| Menu APIs | Yes | Yes | Yes | Dock menu and Dock icon controls are macOS-only. |
| Power monitor | Yes | Yes | Partial | Some event types are platform-specific in Electron. |
| Power save blocker | Yes | Yes | Yes | Uses Electron `powerSaveBlocker`. |
| Screen/display APIs | Yes | Yes | Yes | Uses Electron `screen`. |
| Process guardian | Yes | Yes | Yes | Forwards uncaught main-process errors to renderer windows. |

## Packaging targets

| Entry point | macOS | Windows | Linux | Notes |
|---|---:|---:|---:|---|
| `npx cap-electron build mac` | Yes | Cross-build limited | Cross-build limited | Passes `--mac --x64 --arm64` to electron-builder. |
| `npx cap-electron build win` | Cross-build limited | Yes | Cross-build limited | Passes `--win --x64 --arm64`. Signing and native tooling may still require platform-specific setup. |
| `npx cap-electron build linux` | Cross-build limited | Cross-build limited | Yes | Passes `--linux --x64`. |
| Template `npm run dist:mac` | Yes | Cross-build limited | Cross-build limited | Builds x64 and arm64 DMG. |
| Template `npm run dist:win` | Cross-build limited | Yes | Cross-build limited | Builds x64 NSIS only; use `dist:win:arm64` for arm64. |
| Template `npm run dist:linux` | Cross-build limited | Cross-build limited | Yes | Builds x64 AppImage. |

See the [electron-builder CLI docs](https://www.electron.build/docs/cli/) for current platform and architecture packaging rules.
