# Electron Desktop APIs

Desktop-only APIs are exposed under `window.Electron.*`. They are intentionally separate from Capacitor-compatible plugins so app code can clearly see when it depends on Electron.

For per-namespace macOS, Windows, and Linux support, see [platform-support.md](platform-support.md).

## Window controls

```ts
await window.Electron.minimize();
await window.Electron.toggleMaximize();
await window.Electron.setFullscreen(true);
const fullscreen = await window.Electron.isFullscreen();
```

These helpers operate on the sender window. `setBadgeCount()` and `getBadgeCount()` delegate to Electron's app badge APIs, which are fully useful on macOS and platform-dependent elsewhere.

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

Choose the key mode before the first write. Switching between `'plain'` and `'hashed'` does not migrate existing data; applications that change modes later must migrate their own records.

In `'hashed'` mode, `secureStorage.keys()` rejects with an error. This is intentional: the store does not save original key names, and returning SHA-256 storage keys would be misleading because `get()` and `remove()` expect the original key and would hash the hash again. Values remain encrypted by Electron `safeStorage` in both modes.

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

Download events include `started`, `updated`, and one final outcome event: `completed`, `cancelled`, or `interrupted`. Active downloads can be paused, resumed, or cancelled by id.

Known limitation: download requests are correlated with Electron
`will-download` events by URL and FIFO order. This keeps the bridge simple and
avoids mutating the requested URL, but two concurrent downloads of the same URL
from the same session can be ambiguous if they use different `savePath` values.
Avoid starting duplicate same-URL downloads at the same time when the destination
path matters.

## External commands

`window.Electron.externalCommands` runs native executables that are explicitly allowlisted in `capacitor.config`. Renderer code can only call a configured alias; it cannot choose an arbitrary command path at runtime.

```ts
plugins: {
  Electron: {
    app: {
      externalCommands: {
        rawPrint: {
          command: 'RawPrint.exe',
          resolve: 'app',
          platforms: ['win32'],
        },
        calculator: {
          command: 'calc.exe',
          resolve: 'path',
          platforms: ['win32'],
        },
      },
    },
  },
}
```

Resolution modes:

| Mode | Meaning |
|---|---|
| `app` | Runs `resources/app/bin/<command>` in packaged builds, or `electron/app/bin/<command>` in dev. |
| `path` | Runs a bare executable name through the host `PATH`, for example `calc.exe` or `vlc`. |
| `absolute` | Runs the absolute path configured in `command`. |

Commands always use `spawn(command, args, { shell: false })`, so arguments are passed as an argv array rather than interpolated into a shell command.

Each command has a timeout. The default is 30 seconds; set `timeoutMs: 0` to
disable it for a specific allowlisted command. When a timeout expires, Capacitor
Electron marks the result as `timedOut`, sends `SIGTERM`, and then sends
`SIGKILL` after a short grace period if the process has not exited. This keeps
well-behaved tools graceful while still cleaning up commands that ignore
termination.

`maxOutputBytes` limits captured `stdout` and `stderr` stored on the final
result. The default is 1 MiB per stream. Set `maxOutputBytes: 0` to disable
result capture; output events from `start()` still stream chunks to listeners.

Capture short command output with `run()`:

```ts
const result = await window.Electron.externalCommands.run('rawPrint', {
  args: ['list'],
});

console.log(result.exitCode, result.stdout, result.stderr);
```

Send binary stdin, for example ESC/POS receipt data:

```ts
await window.Electron.externalCommands.run('rawPrint', {
  args: ['print', '--default', '--stdin'],
  stdin: receiptBytes,
});
```

For longer-running tools, use `start()` and subscribe to output and exit events:

```ts
const offOutput = window.Electron.externalCommands.onOutput(event => {
  console.log(event.id, event.stream, event.text);
});
const offExit = window.Electron.externalCommands.onExit(event => {
  console.log(event.result.exitCode);
});

const proc = await window.Electron.externalCommands.start('rawPrint', {
  args: ['print', '--default', '--stdin'],
  stdinBase64: receiptBase64,
});

await window.Electron.externalCommands.kill(proc.id);
offOutput();
offExit();
```

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

## Global shortcuts

```ts
const ok = await window.Electron.registerShortcut('CmdOrCtrl+Shift+K', 'open-search');
const off = window.Electron.onShortcut(({ event }) => console.log(event));
await window.Electron.unregisterShortcut('CmdOrCtrl+Shift+K');
```

Renderer-registered shortcuts are app-lifetime registrations backed by Electron `globalShortcut`. Registration returns `false` when the OS or another app already owns the accelerator.

## Native menus

```ts
await window.Electron.showContextMenu({ data: { rowId: '42' } });
const off = window.Electron.onMenuAction(({ source, action, data }) => console.log(source, action, data));
```

The menu templates stay in user-owned files under `electron/src/user/menu/`. Renderer code can request the configured context menu and listen for actions from app, context, Dock, and tray menus.

## Power and displays

```ts
const idle = await window.Electron.getPowerMonitorIdleState(30);
const blockerId = await window.Electron.startPowerSaveBlocker('prevent-display-sleep');
const displays = await window.Electron.getAllDisplays();
```

Power monitor events, power save blockers, and screen/display data wrap Electron `powerMonitor`, `powerSaveBlocker`, and `screen`. Event availability can vary by operating system and desktop environment.

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

Use `appPath` for internal application windows. These windows load the app's own renderer content and receive the full preload bridge, including `window.Electron` and built-in Capacitor plugin IPC. `appPath` must be app-relative (`#/settings`, `?window=settings`, or `/settings`) and cannot be an absolute URL. `#/...` routes are recommended when the production app uses `serveMode: 'file'`; `/...` routes work naturally in dev/protocol/server mode and are mapped to a hash route in file mode.

Use `url` for external `http` / `https` content. External URL windows are opened
without the preload bridge, so the loaded page does not receive
`window.Electron`, built-in Capacitor plugin IPC, or any app-owned native API.
`appPath` and `url` are mutually exclusive.

External URL windows are treated as untrusted web content. They keep
`contextIsolation`, `nodeIntegration: false`, and `sandbox: true`; renderer code
cannot override `webPreferences`. Calls to `window.open()` or links with
`target="_blank"` are not allowed to create additional Electron windows. If the
requested popup URL is `http` or `https`, it is opened in the user's default
system browser instead. Top-level navigations inside the external window are
limited to `http` and `https`.

If an external managed window needs to hand off non-web links such as `mailto:`
or a first-party deep link, configure `app.externalWindowAllowedSchemes`:

```ts
plugins: {
  Electron: {
    app: {
      externalWindowAllowedSchemes: ['mailto', 'myapp'],
    },
  },
},
```

Allowlisted non-web popup and top-level navigation URLs are opened through
Electron `shell.openExternal()` and are not loaded inside the Electron window.
Dangerous schemes such as `javascript:`, `data:`, and `vbscript:` are always
blocked, even if listed in config. Unlisted non-web schemes are denied. Keep this
allowlist narrow and add only schemes your app intentionally supports.

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
