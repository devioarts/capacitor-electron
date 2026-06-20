# Browser, InAppBrowser & App Launcher

Built-in Electron implementations of `@capacitor/browser`, `@capacitor/inappbrowser`, and `@capacitor/app-launcher`.

Official references: [Capacitor Browser API](https://capacitorjs.com/docs/apis/browser), [Capacitor App Launcher API](https://capacitorjs.com/docs/apis/app-launcher), [Capacitor InAppBrowser API](https://capacitorjs.com/docs/apis/inappbrowser), and Electron [shell](https://electronjs.org/docs/latest/api/shell).

- `Browser.open()` accepts only `http://` and `https://` and opens an Electron-owned browser window.
- `InAppBrowser.openInExternalBrowser()` and `openInSystemBrowser()` use Electron `shell.openExternal()`.
- `InAppBrowser.openInWebView()` opens an Electron-owned browser window with events.
- `AppLauncher.openUrl()` accepts `http://`, `https://`, and custom schemes explicitly listed in `plugins.Electron.app.appLauncherSchemes`.

No extra configuration required for Browser or for AppLauncher web URLs — install either plugin and it works on Electron out of the box.

Custom AppLauncher schemes are disabled by default. This mirrors the platform declaration model used by Capacitor on iOS (`LSApplicationQueriesSchemes`) and Android (`queries`): declare only schemes your app deliberately needs to query or open.

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'Example',
  webDir: 'dist',
  plugins: {
    Electron: {
      app: {
        appLauncherSchemes: ['myotherapp', 'slack'],
      },
    },
  },
};

export default config;
```

---

## Setup

```bash
# Browser
npm install @capacitor/browser

# App Launcher
npm install @capacitor/app-launcher

npx cap-electron sync
```

For `@capacitor/inappbrowser`, see [in-app-browser.md](in-app-browser.md).

---

## @capacitor/browser

Opens a URL in an Electron-owned browser window. This matches Capacitor Browser's in-app browser model and allows Electron to implement `close()`, `browserFinished`, and `browserPageLoaded`.

### Basic usage

```typescript
import { Browser } from '@capacitor/browser';

await Browser.open({ url: 'https://example.com' });
```

### API reference

#### `open(options)`

| Option | Type | Description |
|--------|------|-------------|
| `url`  | `string` | URL to open — must be `https://` or `http://` |
| `toolbarColor` | `string` | Applied to the Electron toolbar background |
| `presentationStyle` | `'fullscreen' \| 'popover'` | `fullscreen` opens the Electron window fullscreen; `popover` is treated as a normal window |
| `width` | `number` | Initial Electron window width |
| `height` | `number` | Initial Electron window height |
| `windowName` | `string` | Ignored on Electron; this is web-only upstream |

The call resolves once the Electron browser window has been created and the initial navigation has been started.

Non-web schemes, including custom app schemes, are rejected with an error. Use `AppLauncher.openUrl()` for explicitly allowlisted app deep links.

#### `close()`

Closes the active Electron browser window.

#### `getSnapshot()`

Returns `null` — not supported.

### Events

| Event | Status |
|-------|--------|
| `browserFinished` | Emitted when the Electron browser window closes |
| `browserPageLoaded` | Emitted when the embedded page fires `did-finish-load` |

The `Browser` plugin uses the same internal Electron WebView backend as `InAppBrowser.openInWebView()`, but only maps Capacitor Browser's own `OpenOptions`.

---

## @capacitor/app-launcher

Opens a URL or deep-link URI in the appropriate app. Electron delegates the handoff to the OS via `shell.openExternal`.

### Basic usage

```typescript
import { AppLauncher } from '@capacitor/app-launcher';

const { completed } = await AppLauncher.openUrl({ url: 'https://example.com' });
// or a custom scheme listed in plugins.Electron.app.appLauncherSchemes:
const { completed } = await AppLauncher.openUrl({ url: 'myotherapp://action/open' });
```

### API reference

#### `canOpenUrl(options)`

Returns `{ value: false }` when the URL scheme is rejected by the local policy. Returns `{ value: true }` for `http://`, `https://`, or a custom scheme listed in `plugins.Electron.app.appLauncherSchemes`.

Electron has no reliable API to check whether a URL scheme is actually registered on the system, so `{ value: true }` means "allowed by config", not "installed".

The Android-only package-name form such as `com.twitter.android` is not supported on Electron because `shell.openExternal` requires a URL.

```typescript
const { value } = await AppLauncher.canOpenUrl({ url: 'myapp://...' });
// value is true only if 'myapp' is listed in plugins.Electron.app.appLauncherSchemes
```

#### `openUrl(options)`

| Option | Type | Description |
|--------|------|-------------|
| `url`  | `string` | `http://`, `https://`, or an allowlisted app deep-link URI |

Returns `{ completed: true }` on success, `{ completed: false }` on error or rejected scheme.

Rejected schemes return `{ completed: false }` without throwing. Script-like schemes (`javascript:`, `data:`, `vbscript:`) are always rejected, even if listed in config.

---

## Platform behaviour

`Browser.open()` uses an Electron-owned window. `InAppBrowser.openInExternalBrowser()`, `InAppBrowser.openInSystemBrowser()`, and AppLauncher external handoffs use `shell.openExternal()`.

All Browser and AppLauncher methods are available on macOS, Windows, and Linux. `canOpenUrl()` is partial on every OS because Electron does not expose a reliable cross-platform installed-app query. See [platform-support.md](platform-support.md).

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| `getSnapshot()` | Returns null | Snapshot capture is not implemented for the embedded browser view yet |
| `canOpenUrl()` | Checks local scheme policy only | No reliable OS API to test scheme registration in Electron |
