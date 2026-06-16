# Global shortcuts

Register system-wide keyboard shortcuts that fire even when the app has no focus.
Useful for tray apps, menu-bar utilities, or any app that needs a "bring to front" hotkey.

---

## Static shortcuts

Define shortcuts in `electron/src/user/shortcuts.ts`. This file is never overwritten by `cap-electron sync`.

```typescript
import type { GlobalShortcutDef } from '../system/static/electron-api/shortcuts-main';

export const shortcuts: GlobalShortcutDef[] = [
  { accelerator: 'CmdOrCtrl+Shift+K', event: 'open-search' },
  { accelerator: 'CmdOrCtrl+Shift+H', action: 'toggleWindow' },
];
```

Three variants are available:

| Variant | When to use |
|---|---|
| `event` | Trigger UI logic in the renderer (open modals, toggle panels, etc.) |
| `action` | Run a built-in main-process action (show/hide window, quit, etc.) |
| `handler` | Run arbitrary custom code in the main process |

### `event` — send to renderer

```typescript
{ accelerator: 'CmdOrCtrl+Shift+K', event: 'open-search' }
```

The main process sends `{ event: 'open-search' }` to the renderer.
Listen for it with `window.Electron.onShortcut()` — see [Listening in the renderer](#listening-in-the-renderer).

### `action` — built-in main-process action

```typescript
{ accelerator: 'CmdOrCtrl+Shift+H', action: 'toggleWindow' }
```

Runs one of the built-in actions directly in the main process.
Works even when the window is hidden or the renderer is not ready.
See the [Actions reference](#actions-reference) for the full list.

### `handler` — custom main-process code

```typescript
import { Notification } from 'electron';

{ accelerator: 'CmdOrCtrl+Shift+N', handler: () => {
  new Notification({ title: 'Hello' }).show();
}}
```

The callback runs in the main process. You have full access to the Electron API.

---

## Dynamic shortcuts

Register or unregister shortcuts at runtime from the renderer.
Only the `event` variant is available dynamically — if you need an `action` or custom `handler`, define the shortcut statically in `shortcuts.ts`.

```typescript
// Register — returns true if the accelerator was free, false if taken
const ok = await window.Electron.registerShortcut('CmdOrCtrl+Shift+P', 'open-palette');

// Unregister when no longer needed
await window.Electron.unregisterShortcut('CmdOrCtrl+Shift+P');
```

All dynamically registered shortcuts are cleaned up automatically when the app quits — no manual cleanup required on exit.

---

## Listening in the renderer

Subscribe to `event`-based shortcuts with `onShortcut()`. The method returns an unsubscribe function — always call it on unmount to avoid memory leaks.

```typescript
// React
useEffect(() => {
  return window.Electron.onShortcut(({ event }) => {
    if (event === 'open-search') setSearchOpen(true);
  });
}, []);
```

```typescript
// Vue
onMounted(() => {
  const unsub = window.Electron.onShortcut(({ event }) => {
    if (event === 'open-palette') openCommandPalette();
  });
  onUnmounted(unsub);
});
```

Multiple shortcuts can share one listener — dispatch by `event` name:

```typescript
useEffect(() => {
  return window.Electron.onShortcut(({ event }) => {
    switch (event) {
      case 'open-search':  setSearchOpen(true); break;
      case 'toggle-theme': toggleTheme(); break;
    }
  });
}, []);
```

---

## Actions reference

| Action | Effect |
|---|---|
| `quit` | Quit the application |
| `minimize` | Minimize the window to the taskbar |
| `maximize` | Maximize the window |
| `toggleMaximize` | Toggle between maximized and normal state |
| `toggleFullscreen` | Toggle fullscreen mode |
| `toggleWindow` | Visible → hide; hidden or minimized → show and focus. Ideal for tray apps. |
| `focus` | Show and bring the window to the front |
| `reload` | Reload the renderer |
| `openDevTools` | Open DevTools |

---

## `window.Electron` API

### `registerShortcut(accelerator, event)`

Register a global shortcut from the renderer at runtime.

```typescript
registerShortcut(accelerator: string, event: string): Promise<boolean>
```

Returns `true` if registration succeeded, `false` if the accelerator is already taken by another application.

### `unregisterShortcut(accelerator)`

Unregister a shortcut registered via `registerShortcut()`.

```typescript
unregisterShortcut(accelerator: string): Promise<void>
```

### `onShortcut(callback)`

Subscribe to shortcut events. Returns an unsubscribe function.

```typescript
onShortcut(callback: (data: { event: string }) => void): () => void
```

---

## Accelerator syntax

Accelerators follow the [Electron accelerator format](https://www.electronjs.org/docs/latest/api/accelerator).

| Token | Meaning |
|---|---|
| `CmdOrCtrl` | `Cmd` on macOS, `Ctrl` on Windows/Linux (recommended) |
| `Alt` | `Option` on macOS, `Alt` on Windows/Linux |
| `Shift` | Shift key |
| `Super` | `Win` key on Windows, `Cmd` on macOS |
| `F1`–`F24` | Function keys |

Examples: `CmdOrCtrl+Shift+K`, `Alt+F4`, `Super+L`

---

## Notes

- **Conflicts** — if the accelerator is already registered by another app, `globalShortcut.register` silently fails. `registerShortcut()` from the renderer returns `false` in that case; static shortcuts have no return value, so test during development.
- **Cleanup** — all shortcuts (static and dynamic) are unregistered automatically on `app.will-quit` via a single `globalShortcut.unregisterAll()` call.
- **Renderer not ready** — `action` and `handler` shortcuts work even before the renderer has loaded. `event` shortcuts are silently dropped if the window does not exist yet.
- **`toggleWindow` on macOS** — uses `win.hide()` / `win.show()`, which does not affect the Dock. If you want the app to disappear from the Dock as well, combine this with a tray icon setup.
