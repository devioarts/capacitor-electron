# Window state persistence

Remember window size, position, and maximized state between application launches.

> Disabled by default. Enable with a single config field.

---

## Setup

```typescript
// capacitor.config.ts
plugins: {
  Electron: {
    persistWindowState: true,
  },
},
```

When enabled, state is written to:
```
{userData}/window-state.json
```

where `{userData}` is the path returned by `app.getPath('userData')` — typically:
- **macOS:** `~/Library/Application Support/{AppName}`
- **Windows:** `%APPDATA%\{AppName}`
- **Linux:** `~/.config/{AppName}`

---

## What is saved

```json
{
  "x": 100,
  "y": 200,
  "width": 1200,
  "height": 800,
  "isMaximized": false
}
```

| Field | Description |
|---|---|
| `x`, `y` | Position of the window's top-left corner |
| `width`, `height` | Window dimensions in pixels |
| `isMaximized` | Whether the window was maximized |

When the window is maximized, the **pre-maximize bounds** are saved (via `win.getNormalBounds()`). On the next launch the window is created at those bounds and then maximized immediately — so `Unmaximize` restores the correct size.

---

## Multi-monitor support

If the saved position falls outside all currently connected monitors (e.g. a monitor was unplugged), the position is discarded and the window opens at the default position on the primary monitor. Saved dimensions are preserved.

---

## Interaction with other config

`persistWindowState: true` takes over the initial window size. The `width` and `height` config fields serve as **defaults for the first launch** or when no saved state exists:

```typescript
plugins: {
  Electron: {
    persistWindowState: true,
    width: 1400,   // used only on first launch
    height: 900,   // or after window-state.json is deleted
  },
},
```

---

## Notes

- State is saved with a 500 ms debounce after each resize/move event — not on every mouse movement.
- On window close, state is saved synchronously (before the `close` event fires) so data is never lost on forced exit.
- Delete `window-state.json` manually to reset to the configured defaults.
- No external dependency — uses only Node.js `fs` and Electron's `app` and `screen` modules.
