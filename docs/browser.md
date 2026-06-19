# Browser & App Launcher

Built-in Electron implementations of `@capacitor/browser` and `@capacitor/app-launcher`. The goal is to keep the same API semantics as the official Capacitor plugins while mapping them onto Electron's `shell.openExternal` primitive:

- `Browser.open()` accepts only `http://` and `https://`.
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

---

## @capacitor/browser

Opens a URL in the user's default system browser. Electron cannot control or observe the browser window once it is open.

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

Opens the URL with `shell.openExternal`. The call resolves once the OS has accepted the request, not when the browser page has loaded.

Non-web schemes, including custom app schemes, are rejected with an error. Use `AppLauncher.openUrl()` for explicitly allowlisted app deep links.

#### `close()`

No-op — Electron has no API to close an external browser window opened with `shell.openExternal`.

#### `getSnapshot()`

Returns `null` — not supported.

### Events

| Event | Status |
|-------|--------|
| `browserFinished` | Never emitted — `shell.openExternal` is fire-and-forget |
| `browserPageLoaded` | Never emitted |

The listener is accepted without error but never fires. Use `addListener` / `removeListener` normally.

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

`shell.openExternal` is an OS-level call. Browser limits that handoff to web URLs. AppLauncher allows web URLs plus configured app schemes. The call is asynchronous and resolves once the OS has accepted the handoff.

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| `close()` | No-op | No Electron API to close external windows |
| `getSnapshot()` | Returns null | No access to external browser content |
| `canOpenUrl()` | Checks local scheme policy only | No reliable OS API to test scheme registration in Electron |
| `browserFinished` / `browserPageLoaded` | Never emitted | `shell.openExternal` is fire-and-forget |
