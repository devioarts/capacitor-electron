# Electron Desktop APIs

Desktop-only APIs are exposed under `window.Electron.*`. They are intentionally separate from Capacitor-compatible plugins so app code can clearly see when it depends on Electron.

## Native dialogs

```ts
await window.Electron.dialogs.showOpenDialog({ properties: ['openFile'] });
await window.Electron.dialogs.showSaveDialog({ defaultPath: 'export.pdf' });
await window.Electron.dialogs.showMessageBox({ message: 'Done' });
```

## Secure storage

```ts
await window.Electron.secureStorage.set('token', 'secret');
const token = await window.Electron.secureStorage.get('token');
```

Values are encrypted with Electron `safeStorage` and stored in `userData/CapacitorStorage/secure-storage.json`. Check `isEncryptionAvailable()` and `getSelectedStorageBackend()` on Linux because some environments may fall back to weaker storage.

## Protocols

```ts
const schemes = await window.Electron.protocols.getConfiguredSchemes();
await window.Electron.protocols.setAsDefaultProtocolClient('myapp');
```

Renderer code may only register schemes already present in Capacitor Electron config, such as `deepLinkingScheme` or `appLauncherSchemes`.

## Session

```ts
await window.Electron.session.clearCache();
const cookies = await window.Electron.session.getCookies({});
await window.Electron.session.setProxy({ proxyRules: 'http=localhost:8080' });
```

This is a constrained wrapper around the current window session: cache, storage data, cookies, proxy, user agent, and connection cleanup.

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

## Auto launch

```ts
const enabled = await window.Electron.autoLaunch.isEnabled();
await window.Electron.autoLaunch.setEnabled(true);
```

Uses Electron login item settings.

## Native theme

```ts
const theme = await window.Electron.nativeTheme.get();
const off = window.Electron.nativeTheme.onUpdated(next => console.log(next));
await window.Electron.nativeTheme.setThemeSource('system');
```

Supports `system`, `light`, and `dark` theme sources.

## Managed windows

```ts
const child = await window.Electron.windows.create({
  url: 'https://example.com/',
  width: 900,
  height: 700,
});

await window.Electron.windows.focus(child.id);
```

Managed windows use the same secure preload defaults as the main app window and can be listed, focused, shown, hidden, resized, and closed.

Renderer-created managed windows accept only `http` and `https` URLs and a whitelist of normal window options. They cannot override `webPreferences`.
