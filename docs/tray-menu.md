# Tray menu

Show an icon in the system tray (Windows taskbar, macOS menu bar, Linux). Useful for background-service apps, menu-bar utilities, or any app that should stay accessible while hidden.

---

## Enable the tray

In `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  plugins: {
    Electron: {
      ui: {
        tray: {
          enabled: true,
          icon: 'tray.png',
          tooltip: 'My App',
          minimizeToTray: true,
        },
      },
    },
  },
};
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `ui.tray.enabled` | `boolean` | `false` | Enable the tray icon |
| `ui.tray.icon` | `string` | — | Tray icon asset. Use `'tray.png'` for `electron/assets/tray.png`, or `'/public/assets/tray.png'` to copy from the project root during sync. Falls back to the window icon (`browserWindow.icon`). |
| `ui.tray.tooltip` | `string` | — | Tooltip shown on hover |
| `ui.tray.minimizeToTray` | `boolean` | `false` | Hide the window instead of quitting when the user clicks the close button |

---

## Customize the context menu

Edit `electron/src/user/menu/tray.ts` — this file is never overwritten by `cap-electron sync`.

```typescript
import type { TrayMenuItemDef } from '../../system/static/electron-api/tray-main';

export const trayMenu: TrayMenuItemDef[] = [
  { label: 'Open', action: 'show' },
  { action: 'separator' },
  { label: 'Quit', action: 'quit' },
];
```

Four variants are available:

| Variant | Effect |
|---|---|
| `action: 'show'` | Show and focus the main window |
| `action: 'quit'` | Quit the application |
| `action: 'separator'` | Visual divider line (no `label` needed) |
| `handler: () => void` | Run arbitrary main-process code |

### Custom handler

```typescript
import { shell } from 'electron';

export const trayMenu: TrayMenuItemDef[] = [
  { label: 'Open', action: 'show' },
  { action: 'separator' },
  { label: 'Open logs', handler: () => shell.openPath('/path/to/logs') },
  { label: 'Check for updates', handler: () => autoUpdater.checkForUpdates() },
  { action: 'separator' },
  { label: 'Quit', action: 'quit' },
];
```

The handler runs in the main process — full Electron API is available.

---

## Tray icon click

Clicking the tray icon toggles window visibility:
- **Visible** → hides the window
- **Hidden or minimized** → shows and focuses the window

---

## minimizeToTray

When `minimizeToTray: true`:
- Clicking the window's close button hides the window to tray instead of quitting
- Quitting via the tray context menu (or `app.quit()`) works normally
- On macOS, clicking the Dock icon shows the window again

---

## Icon format

- **Windows / Linux** — use a PNG (typically 16×16 or 32×32 px)
- **macOS** — use a template image: a monochrome PNG named `tray.png` with a `tray@2x.png` at 2× the size. macOS automatically applies the correct color for light/dark mode when the image is a template image (transparent background, black shapes)

Place icons in `electron/assets/` and reference them by filename (e.g. `'tray.png'`), or use
a leading slash to copy from the project root during `cap-electron sync`
(e.g. `'/public/assets/tray.png'`).

---

## Menu-bar app (macOS)

For a pure menu-bar app with no Dock icon, enable `ui.dock.hideIcon`:

```typescript
plugins: {
  Electron: {
    ui: {
      tray: {
        enabled: true,
        icon: 'tray.png',
      },
      dock: {
        hideIcon: true,
      },
    },
  },
},
```

This option only affects macOS. Windows and Linux ignore it.
