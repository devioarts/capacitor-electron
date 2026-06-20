# Native menus

Electron has four native menu surfaces: application menu, renderer context menu, macOS Dock menu, and tray menu. Capacitor Electron keeps the config simple and puts programmable menu templates in user-owned files.

| Menu | Enable/configure | User file |
|---|---|---|
| Application menu | `ui.menu` | `electron/src/user/menu/app.ts` |
| Renderer context menu | `ui.contextMenu` | `electron/src/user/menu/context.ts` |
| macOS Dock menu | `ui.dock.menu` | `electron/src/user/menu/dock.ts` |
| Tray menu | `ui.tray.enabled` | `electron/src/user/menu/tray.ts` |

All files under `electron/src/user/menu/` are safe to edit and are not overwritten by `cap-electron upgrade`.

---

## Application Menu

Set `ui.menu` under `plugins.Electron` in `capacitor.config.ts`.

```typescript
plugins: {
  Electron: {
    ui: {
      menu: true,
    },
  },
},
```

When `ui.menu` is `true` or an object, Capacitor Electron calls `electron/src/user/menu/app.ts`. If that file returns `null`, the built-in preset is used.

```typescript
// electron/src/user/menu/app.ts
import type { MenuItemConstructorOptions } from 'electron';
import type { MenuContext } from '../../system/static/electron-api/menu-main';

export function appMenu(ctx: MenuContext): MenuItemConstructorOptions[] {
  return [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => ctx.getWin()?.reload() },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => ctx.send('open-settings') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    ...(ctx.isDev ? [{ role: 'viewMenu' as const }] : []),
  ];
}
```

### Built-in Preset

```typescript
plugins: {
  Electron: {
    ui: {
      menu: {
        editMenu: true,
        viewMenu: false,
      },
    },
  },
},
```

| Option | Type | Default | Description |
|---|---|---|---|
| `ui.menu` | `false \| true \| object` | `undefined` | `false` hides the menu; `true` enables user/preset menu; object enables the preset with options; omit to keep Electron's default |
| `ui.menu.editMenu` | `boolean` | `true` | Include the standard Edit menu |
| `ui.menu.viewMenu` | `boolean` | `true` in dev, `false` in prod | Include the View menu (Reload, DevTools, Zoom) |

In development, `viewMenu` is always included for the built-in preset so Reload and DevTools remain accessible.

### Hide The Menu

```typescript
plugins: {
  Electron: {
    ui: {
      menu: false,
    },
  },
},
```

On macOS a minimal App menu with Quit is kept so Cmd+Q continues to work. On Windows/Linux the menu bar is removed completely.

---

## Context Menu

Enable renderer context menus with `ui.contextMenu`.

```typescript
plugins: {
  Electron: {
    ui: {
      contextMenu: true,
    },
  },
},
```

Then edit `electron/src/user/menu/context.ts`:

```typescript
import type { MenuItemConstructorOptions } from 'electron';
import type { ContextMenuContext } from '../../system/static/electron-api/menu-main';

export function contextMenu(ctx: ContextMenuContext): MenuItemConstructorOptions[] | null {
  if (ctx.params.isEditable) {
    return [
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { role: 'selectAll' },
    ];
  }

  return [
    { role: 'copy' },
    { type: 'separator' },
    { label: 'Inspect Item', click: () => ctx.send('inspect-context', { x: ctx.params.x, y: ctx.params.y }) },
    { label: 'Reload', click: () => ctx.window.reload() },
  ];
}
```

Return `null` or an empty array to show no menu for that right-click.

---

## Dock Menu

Dock menus are macOS-only. Enable them with `ui.dock.menu`.

```typescript
plugins: {
  Electron: {
    ui: {
      dock: {
        menu: true,
      },
    },
  },
},
```

Then edit `electron/src/user/menu/dock.ts`:

```typescript
import type { MenuItemConstructorOptions } from 'electron';
import type { MenuContext } from '../../system/static/electron-api/menu-main';

export function dockMenu(ctx: MenuContext): MenuItemConstructorOptions[] {
  return [
    { label: 'Show Window', click: () => ctx.showWindow() },
    { label: 'Open Settings', click: () => ctx.send('open-settings') },
  ];
}
```

`ui.dock.hideIcon: true` hides the Dock icon entirely, so a Dock menu is only useful when the icon remains visible.

---

## Tray Menu

Tray menus are covered in [tray-menu.md](tray-menu.md). They use `ui.tray.enabled` and `electron/src/user/menu/tray.ts`.

---

## Sending Actions To The Web App

Every menu context has:

| Helper | Description |
|---|---|
| `ctx.send(action, data?)` | Sends a typed menu action to the renderer and focuses the main window |
| `ctx.showWindow()` | Shows/focuses the main window and returns it |
| `ctx.getWin()` | Returns the current main window without changing visibility |

Use `ctx.send()` from any native menu:

```typescript
{
  label: 'Open Settings',
  accelerator: 'CmdOrCtrl+,',
  click: () => ctx.send('open-settings', { tab: 'general' }),
}
```

Handle it in the web app:

```typescript
const unsubscribe = window.Electron.onMenuAction(({ source, action, data }) => {
  if (action === 'open-settings') {
    router.push('/settings');
  }
});

// Call on component unmount.
unsubscribe();
```

`source` is one of `'app'`, `'context'`, `'dock'`, or `'tray'`.

---

## Notes

- Menu templates use Electron `MenuItemConstructorOptions`, so roles, accelerators, nested submenus, checkbox/radio items, icons, and platform-specific entries are available.
- Prefer Electron roles (`editMenu`, `viewMenu`, `copy`, `paste`, `quit`, etc.) for native behavior.
- `browserWindow.autoHideMenuBar` hides the menu bar on Windows/Linux until the user presses Alt. It works independently of `ui.menu`.
- Global keyboard shortcuts are separate from menu accelerators; see [global-shortcuts.md](global-shortcuts.md).
