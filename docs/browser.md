# Browser & App Launcher

Built-in Electron implementations of `@capacitor/browser` and `@capacitor/app-launcher`. Both plugins open URLs in the default OS application — they share the same underlying `shell.openExternal` call and are implemented in one file.

No extra configuration required — install either plugin and it works on Electron out of the box.

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
| `url`  | `string` | URL to open — must be `https://`, `http://`, or a custom scheme |

Opens the URL with `shell.openExternal`. The call resolves once the OS has accepted the request, not when the browser page has loaded.

Unsafe schemes (`javascript:`, `data:`, `vbscript:`) are rejected with an error.

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

Opens a URL or deep-link URI in the appropriate app. On Electron this is equivalent to Browser — `shell.openExternal` delegates to the OS.

### Basic usage

```typescript
import { AppLauncher } from '@capacitor/app-launcher';

const { completed } = await AppLauncher.openUrl({ url: 'https://example.com' });
// or a custom scheme:
const { completed } = await AppLauncher.openUrl({ url: 'myotherapp://action/open' });
```

### API reference

#### `canOpenUrl(options)`

Always returns `{ value: true }` — Electron has no API to check whether a URL scheme is registered on the system.

```typescript
const { value } = await AppLauncher.canOpenUrl({ url: 'myapp://...' });
// value is always true
```

#### `openUrl(options)`

| Option | Type | Description |
|--------|------|-------------|
| `url`  | `string` | URL or deep-link URI to open |

Returns `{ completed: true }` on success, `{ completed: false }` on error or rejected scheme.

Unsafe schemes (`javascript:`, `data:`, `vbscript:`) return `{ completed: false }` without throwing.

---

## Platform behaviour

`shell.openExternal` is an OS-level call — it opens whatever application is registered for the URL scheme (browser for `http://https://`, file manager for `file://`, etc.). The call is asynchronous and resolves once the OS has accepted the handoff.

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| `close()` | No-op | No Electron API to close external windows |
| `getSnapshot()` | Returns null | No access to external browser content |
| `canOpenUrl()` | Always true | No OS API to test scheme registration in Electron |
| `browserFinished` / `browserPageLoaded` | Never emitted | `shell.openExternal` is fire-and-forget |
