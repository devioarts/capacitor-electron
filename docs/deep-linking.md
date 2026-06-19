# Deep linking

Register a custom URL protocol (`myapp://`) so the operating system opens your app when the user clicks a matching link.

---

## Setup

### 1. Set the scheme in `capacitor.config.ts`

```typescript
plugins: {
  Electron: {
    app: {
      deepLinkingScheme: 'myapp',
    },
  },
},
```

The scheme is the part before `://`. Use lowercase letters and hyphens only (`my-app` is valid, `My App` is not).

### 2. Register the protocol with the OS (production)

The app registers itself as the default handler automatically via `app.setAsDefaultProtocolClient`. In **production** this happens at launch. In **development** it also registers but prints a warning to the console.

On **macOS** you additionally need to declare the scheme in `plugins.Electron.builder`:

```typescript
plugins: {
  Electron: {
    builder: {
      mac: {
        extendInfo: {
          CFBundleURLTypes: [
            {
              CFBundleURLSchemes: ['myapp'],
              CFBundleURLName: 'com.example.myapp',
            },
          ],
        },
      },
    },
  },
},
```

On **Windows** and **Linux** no extra build config is needed — `setAsDefaultProtocolClient` handles registration.

### 3. Listen for incoming URLs in the renderer

```typescript
const unsub = window.Electron.onDeepLink?.(({ url }) => {
  console.log('Opened via deep link:', url);
  // e.g. router.push(parseDeepLinkPath(url));
});

// Stop listening when no longer needed
unsub?.();
```

---

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `app.deepLinkingScheme` | `string` | `undefined` (disabled) | URL scheme to register, e.g. `'myapp'` |

---

## `window.Electron` API

### `onDeepLink(callback)`

Subscribe to incoming deep link URLs. Returns an unsubscribe function.

```typescript
onDeepLink?(callback: (data: { url: string }) => void): () => void;
```

The method is only present when `app.deepLinkingScheme` is configured — guard with optional chaining (`?.`).

---

## Platform behaviour

| Platform | How the URL arrives |
|---|---|
| **macOS** | System fires `app.on('open-url')`. Works when the app is already running or launched cold via the link. |
| **Windows (cold start)** | URL is passed as a CLI argument in `process.argv`. Processed after the window is created. |
| **Windows (app running)** | Second-instance lock fires with the URL in `argv`. The existing window is focused and the URL is forwarded. |
| **Linux (app running)** | Second-instance lock fires with the URL in `argv`. Works the same as Windows. |
| **Linux (cold start)** | Not supported — `app.on('open-url')` is macOS-only and Linux cold-start URL is not extracted from `process.argv`. Register the shortcut in your `.desktop` file and handle the URL on startup manually. |

In all cases the window is restored (if minimized or hidden), focused, and then the `deepLink` IPC event is sent to the renderer.

---

## Full usage example

```typescript
// e.g. in App.vue / App.tsx

onMounted(() => {
  const unsub = window.Electron.onDeepLink?.(({ url }) => {
    const parsed = new URL(url);

    switch (parsed.hostname) {
      case 'auth':
        handleOAuthCallback(parsed.searchParams.get('code'));
        break;
      case 'invite':
        openInvite(parsed.pathname.slice(1));
        break;
      default:
        console.warn('Unknown deep link:', url);
    }
  });

  onUnmounted(() => unsub?.());
});
```

---

## Notes

- Protocol registration is intentionally kept after quit so cold-start deep links continue to work.
- In dev mode, registering the protocol works but may conflict with other Electron apps using the same scheme — use a unique scheme per project.
- The `onDeepLink` handler may fire before your router is ready. Queue or defer handling if needed.
- `singleInstance` (default `true`) is required for Windows second-instance deep links to work. If you disable it, the second process exits immediately and the URL is never forwarded.
