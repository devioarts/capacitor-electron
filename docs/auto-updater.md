# Auto-updater

Automatic application updates via `electron-updater` from the `electron-builder` ecosystem.

> Only active in **production** (`app.isPackaged === true`). Does nothing in development.

---

## Setup

### 1. Configure electron-builder

Set `plugins.Electron.builder.publish` so `electron-updater` knows where to check for updates. Example using GitHub Releases:

```typescript
plugins: {
  Electron: {
    builder: {
      publish: {
        provider: 'github',
        owner: 'your-org',
        repo: 'your-repo',
      },
    },
  },
},
```

See the [electron-builder publish docs](https://www.electron.build/docs/publish/) for S3, generic HTTP server, and other providers.

### 2. Enable the updater in `capacitor.config.ts`

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

### 3. Use the bridge in the renderer

```typescript
// Check for updates manually
await window.Electron.updater.checkForUpdate();

// Listen for events
const unsub = window.Electron.updater.on('update-available', (info) => {
  console.log('New version available:', info.version);
});

// Stop listening
unsub();
```

---

## Configuration options

All options live under `plugins.Electron.app.autoUpdater` in `capacitor.config.ts`.

| Option | Type | Default | Description |
|---|---|---|---|
| `app.autoUpdater.enabled` | `boolean` | `false` | Enable the auto-updater. Must be `true` for anything to run. |
| `app.autoUpdater.channel` | `'latest' \| 'beta' \| 'alpha'` | `'latest'` | Update channel to follow |
| `app.autoUpdater.autoDownload` | `boolean` | `false` | Automatically download update when one is found |
| `app.autoUpdater.autoInstallOnQuit` | `boolean` | `true` | Install downloaded update when the app quits |
| `app.autoUpdater.allowPrerelease` | `boolean` | `false` | Include pre-release versions |
| `app.autoUpdater.allowDowngrade` | `boolean` | `false` | Allow installing an older version |

---

## `window.Electron.updater` API

### Methods

| Method | Returns | Description |
|---|---|---|
| `checkForUpdate()` | `Promise<void>` | Check for a new version |
| `downloadUpdate()` | `Promise<void>` | Start downloading the update (use when `autoDownload` is `false`) |
| `quitAndInstall()` | `void` | Quit the app and install the downloaded update immediately |
| `on(event, callback)` | `() => void` | Subscribe to an updater event. Returns an unsubscribe function. |

### Events

Subscribe with `window.Electron.updater.on(event, callback)`.

| Event | Payload type | Description |
|---|---|---|
| `'checking-for-update'` | `void` | Update check started |
| `'update-available'` | `UpdateInfo` | A newer version exists |
| `'update-not-available'` | `UpdateInfo` | App is already up to date |
| `'download-progress'` | `DownloadProgress` | Download progress tick |
| `'update-downloaded'` | `UpdateInfo` | Download complete, ready to install |
| `'error'` | `{ message: string }` | Something went wrong (non-fatal) |

### `UpdateInfo`

```typescript
interface UpdateInfo {
  version: string;
  releaseNotes?: string | string[] | null;
  releaseDate?: string;
  [key: string]: unknown;
}
```

### `DownloadProgress`

```typescript
interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;       // 0–100
  transferred: number;
  total: number;
}
```

---

## Full usage example

```typescript
const updater = window.Electron.updater;

const listeners = [
  updater.on('checking-for-update', () => {
    console.log('Checking for update…');
  }),
  updater.on('update-available', (info) => {
    showBanner(`Version ${info.version} is available`);
  }),
  updater.on('download-progress', ({ percent }) => {
    setProgressBar(percent);
  }),
  updater.on('update-downloaded', (info) => {
    if (confirm(`Version ${info.version} downloaded. Restart now?`)) {
      updater.quitAndInstall();
    }
  }),
  updater.on('error', ({ message }) => {
    console.error('Updater error:', message);
  }),
];

// Trigger the check
await updater.checkForUpdate();

// Clean up all listeners when component unmounts
// listeners.forEach(unsub => unsub());
```

---

## Notes

- When `enabled` is `false` or missing, no-op IPC handlers are registered (so renderer calls to `checkForUpdate`, etc. succeed silently instead of throwing "no handler" errors). The actual `electron-updater` library is never initialised.
- Updater errors are caught and logged to console; they never crash the main process.
- `checkForUpdate()` must be called explicitly — there is no automatic check on startup. Call it after your app is ready (e.g. in `App.vue` or `App.tsx` `mounted`/`useEffect`).
- When `autoDownload: false`, call `downloadUpdate()` manually after receiving `update-available`.
- `quitAndInstall()` closes the app immediately — prompt the user first.
