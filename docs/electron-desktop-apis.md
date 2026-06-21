# Electron Desktop APIs

Desktop-only APIs are exposed under `window.Electron.*`. They are intentionally separate from Capacitor-compatible plugins so app code can clearly see when it depends on Electron.

For per-namespace macOS, Windows, and Linux support, see [platform-support.md](platform-support.md).

## Native dialogs

```ts
await window.Electron.dialogs.showOpenDialog({ properties: ['openFile'] });
await window.Electron.dialogs.showSaveDialog({ defaultPath: 'export.pdf' });
await window.Electron.dialogs.showMessageBox({ message: 'Done' });
```

Maps to Electron [dialog](https://electronjs.org/docs/latest/api/dialog).

## Secure storage

```ts
await window.Electron.secureStorage.set('token', 'secret');
const token = await window.Electron.secureStorage.get('token');
```

Values are encrypted with Electron `safeStorage` and stored in `userData/CapacitorStorage/secure-storage.json`. By default the JSON object keys are stored as the original key names. Set `plugins.Electron.app.security.secureStorageKeys: 'hashed'` before writing data to store deterministic SHA-256 key hashes instead.

```ts
plugins: {
  Electron: {
    app: {
      security: {
        secureStorageKeys: 'hashed',
      },
    },
  },
}
```

Choose the key mode before the first write. Switching between `'plain'` and `'hashed'` does not migrate existing data; applications that change modes later must migrate their own records. In `'hashed'` mode, `secureStorage.keys()` returns the stored hash keys because the original names are not saved. Values remain encrypted by Electron `safeStorage` in both modes.

Check `isEncryptionAvailable()` and `getSelectedStorageBackend()` on Linux because some environments may fall back to weaker storage.

Official reference: Electron [safeStorage](https://electronjs.org/docs/latest/api/safe-storage).

## Protocols

```ts
const schemes = await window.Electron.protocols.getConfiguredSchemes();
await window.Electron.protocols.setAsDefaultProtocolClient('myapp');
```

Renderer code may only register schemes already present in Capacitor Electron config, such as `app.deepLinkingScheme` or `app.appLauncherSchemes`.

Official references: Electron [app protocol client methods](https://electronjs.org/docs/latest/api/app) and [shell.openExternal](https://electronjs.org/docs/latest/api/shell).

## Session

```ts
await window.Electron.session.clearCache();
const cookies = await window.Electron.session.getCookies({});
await window.Electron.session.setProxy({ proxyRules: 'http=localhost:8080' });
```

This is a constrained wrapper around the current window session: cache, storage data, cookies, proxy, user agent, and connection cleanup.

Official reference: Electron [session](https://electronjs.org/docs/latest/api/session).

## Downloads

```ts
const off = window.Electron.downloads.on(event => console.log(event));
const download = await window.Electron.downloads.start({ url: 'https://example.com/file.zip' });
```

Download events include `started`, `updated`, and `done`. Active downloads can be paused, resumed, or cancelled by id.

## Print and PDF

```ts
const printers = await window.Electron.print.getPrinters();
await window.Electron.print.print();
await window.Electron.print.printToPDF({ path: '/tmp/page.pdf' });
```

Without `path`, `printToPDF()` returns base64 PDF data.

## Desktop capture

```ts
const sources = await window.Electron.desktopCapture.getSources({
  types: ['screen', 'window'],
});
```

Returns source ids, names, display ids, thumbnails, and app icons as data URLs when available.

Official reference: Electron [desktopCapturer](https://electronjs.org/docs/latest/api/desktop-capturer).

## Auto launch

```ts
const enabled = await window.Electron.autoLaunch.isEnabled();
await window.Electron.autoLaunch.setEnabled(true);
```

Uses Electron login item settings. Auto launch is supported on macOS and Windows. On Linux, `isEnabled()` and `setEnabled()` return `false`; apps that need Linux autostart should install a desktop-environment-specific autostart entry.

## Native theme

```ts
const theme = await window.Electron.nativeTheme.get();
const off = window.Electron.nativeTheme.onUpdated(next => console.log(next));
await window.Electron.nativeTheme.setThemeSource('system');
```

Supports `system`, `light`, and `dark` theme sources.

## Process guardian

```ts
const off = window.Electron.onElectronError(error => console.error(error));
```

The template installs a main-process guardian that forwards uncaught exceptions and unhandled promise rejections to the renderer as `electronError` events.

The guardian intentionally owns Node's `process.setUncaughtExceptionCaptureCallback()` hook. That hook is exclusive: user plugins and libraries should not call it themselves. Use `process.on('uncaughtException', ...)`, `process.on('unhandledRejection', ...)`, or plugin-specific error reporting instead.

## Managed windows

```ts
const settings = await window.Electron.windows.create({
  appPath: '#/settings',
  width: 900,
  height: 700,
});

const external = await window.Electron.windows.create({
  url: 'https://example.com/',
  width: 900,
  height: 700,
});

await window.Electron.windows.focus(settings.id);
```

Managed windows can be listed, focused, shown, hidden, resized, and closed.

Use `appPath` for internal application windows. These windows load the app's own renderer content and receive the full preload bridge, including `window.Electron` and built-in Capacitor plugin IPC. `appPath` must be app-relative (`#/settings`, `?window=settings`, or `/settings`) and cannot be an absolute URL. `#/...` routes are recommended when the production app uses `serveMode: 'file'`; `/...` routes work naturally in dev/server mode and are mapped to a hash route in file mode.

Use `url` for external `http` / `https` content. External URL windows are opened without the preload bridge, so the loaded page does not receive `window.Electron`. `appPath` and `url` are mutually exclusive.

Renderer-created managed windows accept a whitelist of normal window options. They cannot override `webPreferences`.

Official reference: Electron [BrowserWindow](https://electronjs.org/docs/latest/api/browser-window).

## Supported operating systems

Most `window.Electron` namespaces are available on macOS, Windows, and Linux. The notable exceptions are:

| API | macOS | Windows | Linux | Notes |
|---|---:|---:|---:|---|
| `autoLaunch` | Yes | Yes | No | Linux returns `false`; create a desktop-environment autostart entry manually. |
| `secureStorage` | Yes | Yes | Partial | Linux depends on secret storage backend availability. |
| Deep-link/protocol cold start | Yes | Yes | Partial | Linux cold-start URL handling depends on desktop integration. |
| Dock menu / Dock icon | Yes | No | No | Electron Dock APIs are macOS-only. |
| Badge count | Yes | Partial | Partial | Electron returns platform-specific support. |
| Desktop capture | Partial | Partial | Partial | OS permission prompts and window-manager behavior apply. |
