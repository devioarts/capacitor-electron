# App menu

Configure the native application menu (menu bar) that Electron shows at the top of the screen (macOS) or the window (Windows/Linux).

---

## Setup

Set `menu` under `plugins.Electron` in `capacitor.config.ts`.

### Hide the menu entirely

```typescript
plugins: {
  Electron: {
    menu: false,
  },
},
```

On **macOS** a minimal App menu (with Quit) is always kept so that **Cmd+Q** continues to work. On **Windows/Linux** the menu bar is removed completely.

### Custom menu

```typescript
plugins: {
  Electron: {
    menu: {
      editMenu: true,   // Undo, Redo, Cut, Copy, Paste, Select All
      viewMenu: false,  // Reload, DevTools, Zoom
    },
  },
},
```

---

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `menu` | `false \| object` | `undefined` | `false` hides the menu; an object builds a custom menu; omit to keep Electron's default |
| `menu.editMenu` | `boolean` | `true` | Include the standard Edit menu |
| `menu.viewMenu` | `boolean` | `true` in dev, `false` in prod | Include the View menu (Reload, DevTools, Zoom) |

> **Dev mode:** `viewMenu` is always included in development regardless of the configured value — Reload and DevTools are always accessible.

---

## Platform behaviour

| Platform | `menu: false` | `menu: {}` |
|---|---|---|
| **macOS** | Minimal App menu (name + Quit only) | Full macOS App menu + configured submenus |
| **Windows / Linux** | No menu bar | Configured submenus only |

On macOS the first menu item is always the application name — this is an OS constraint and cannot be changed.

---

## Related options

- `autoHideMenuBar` — hides the menu bar on Windows/Linux until the user presses **Alt**. Works independently of `menu`.
- `frame: false` + `titleBarStyle` — for fully custom title bars, consider hiding the menu as well.

---

## Notes

- When `menu` is not set (omitted), Electron's default menu is shown unchanged — this is fine for development.
- `menu: false` on macOS does **not** remove the App menu entirely; it replaces the full menu with a minimal one that only contains Quit. This is required by macOS — Cmd+Q must always work.
- Global keyboard shortcuts (`globalShortcut`) are a separate feature and are not affected by this setting.
