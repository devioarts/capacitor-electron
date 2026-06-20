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
import { app, type MenuItemConstructorOptions } from 'electron';
import type { TrayMenuContext } from '../../system/static/electron-api/tray-main';

export function trayMenu(ctx: TrayMenuContext): MenuItemConstructorOptions[] {
  return [
    {
      label: 'Open',
      click: () => ctx.showWindow(),
    },
    {
      label: 'Settings',
      click: () => ctx.send('open-settings'),
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ];
}
```

The function returns a normal Electron `Menu.buildFromTemplate()` template, so roles, accelerators, submenus, checkbox/radio items, icons, and custom `click` handlers are available.

### Advanced menu

```typescript
import { app, nativeImage, type MenuItemConstructorOptions } from 'electron';
import type { TrayMenuContext } from '../../system/static/electron-api/tray-main';

export function trayMenu(ctx: TrayMenuContext): MenuItemConstructorOptions[] {
  const green = nativeImage.createFromDataURL('data:image/png;base64,...');

  return [
    {
      label: 'Open App',
      click: () => ctx.showWindow(),
    },
    {
      label: 'Set Green Icon',
      type: 'checkbox',
      click: ({ checked }) => {
        if (checked) ctx.tray.setImage(green);
      },
    },
    {
      label: 'Set Title',
      type: 'checkbox',
      click: ({ checked }) => {
        ctx.tray.setTitle(checked ? 'Title' : '');
      },
    },
    { type: 'separator' },
    { role: 'quit' },
  ];
}
```

The function runs in the main process. `ctx.tray` is the live Electron `Tray` instance, and `ctx.getWin()` returns the current main window.

Use `ctx.send(action, data?)` to notify the web app:

```typescript
{
  label: 'Open Settings',
  click: () => ctx.send('open-settings', { source: 'tray-menu' }),
}
```

```typescript
// Web app
const unsubscribe = window.Electron.onMenuAction(({ source, action, data }) => {
  if (source === 'tray' && action === 'open-settings') {
    router.push('/settings');
  }
});
```

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
