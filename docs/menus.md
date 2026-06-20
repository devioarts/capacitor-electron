# Native menus

Electron has four native menu surfaces: application menu, renderer context menu, macOS Dock menu, and tray menu. Capacitor Electron keeps the config simple and puts programmable menu templates in user-owned files.

| Menu | Enable/configure | User file |
|---|---|---|
| Application menu | `ui.appMenu.enabled` | `electron/src/user/menu/app.ts` |
| Renderer context menu | `ui.contextMenu.enabled` | `electron/src/user/menu/context.ts` |
| macOS Dock menu | `ui.dockMenu.enabled` | `electron/src/user/menu/dock.ts` |
| Tray menu | `ui.trayMenu.enabled` | `electron/src/user/menu/tray.ts` |

All files under `electron/src/user/menu/` are safe to edit and are not overwritten by `cap-electron upgrade`.

---

## Application Menu

Set `ui.appMenu.enabled` under `plugins.Electron` in `capacitor.config.ts`.

```typescript
plugins: {
  Electron: {
    ui: {
      appMenu: {
        enabled: true,
      },
    },
  },
},
```

When `ui.appMenu.enabled` is `true`, Capacitor Electron calls `electron/src/user/menu/app.ts`. If that file returns `null`, the built-in preset is used.

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

The template `electron/src/user/menu/app.ts` ships with an editable example menu. Return `null` from that file when you want to use this built-in preset instead.

```typescript
plugins: {
  Electron: {
    ui: {
      appMenu: {
        enabled: true,
        editMenu: true,
        viewMenu: false,
      },
    },
  },
},
```

| Option | Type | Default | Description |
|---|---|---|---|
| `ui.appMenu.enabled` | `boolean` | `false` | Read `electron/src/user/menu/app.ts`; if it returns `null`, use the built-in preset |
| `ui.appMenu.hide` | `boolean` | `false` | Hide the menu; on macOS a minimal Quit menu is kept |
| `ui.appMenu.editMenu` | `boolean` | `true` | Include the standard Edit menu in the built-in preset |
| `ui.appMenu.viewMenu` | `boolean` | `true` in dev, `false` in prod | Include the View menu (Reload, DevTools, Zoom) in the built-in preset |

In development, `viewMenu` is always included for the built-in preset so Reload and DevTools remain accessible.

### Hide The Menu

```typescript
plugins: {
  Electron: {
    ui: {
      appMenu: {
        hide: true,
      },
    },
  },
},
```

On macOS a minimal App menu with Quit is kept so Cmd+Q continues to work. On Windows/Linux the menu bar is removed completely.

---

## Context Menu

Enable renderer context menus with `ui.contextMenu.enabled`.

```typescript
plugins: {
  Electron: {
    ui: {
      contextMenu: {
        enabled: true,
      },
    },
  },
},
```

| Option | Type | Default | Description |
|---|---|---|---|
| `ui.contextMenu.enabled` | `boolean` | `false` | Listen for native right-click context menu events and enable `window.Electron.showContextMenu()` |

Then edit `electron/src/user/menu/context.ts`:

```typescript
import type { MenuItemConstructorOptions } from 'electron';
import type { ContextMenuContext } from '../../system/static/electron-api/menu-main';

export function contextMenu(ctx: ContextMenuContext): MenuItemConstructorOptions[] | null {
  if (ctx.target?.id === 'settings-card') {
    return [
      { label: 'Open Settings', click: () => ctx.send('open-settings', ctx.target) },
      { role: 'copy' },
    ];
  }

  if (ctx.target?.classList?.includes('context-row')) {
    return [
      { label: 'Open Row', click: () => ctx.send('open-row', ctx.target?.dataset) },
      { label: 'Archive Row', click: () => ctx.send('archive-row', ctx.target?.dataset) },
    ];
  }

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

Once enabled, Electron invokes the factory when the user opens a context menu in the renderer, usually by right-clicking. Capacitor Electron also captures safe DOM metadata for the clicked element, so `ctx.target` can contain:

| Field | Description |
|---|---|
| `ctx.trigger` | `'right-click'` for the native context-menu event, or `'renderer'` for `window.Electron.showContextMenu()` |
| `ctx.params` | Electron context-menu params such as `isEditable`, `selectionText`, `x`, and `y` |
| `ctx.target.id` | Clicked element id |
| `ctx.target.classList` | Clicked element classes |
| `ctx.target.dataset` | Clicked element `data-*` attributes |
| `ctx.target.text` | Trimmed text from the clicked element |
| `ctx.data` | App data passed by `window.Electron.showContextMenu()` |

This lets one `context.ts` provide the standard editable-field menu and still branch for application-specific targets:

```typescript
if (ctx.target?.id === 'project-card') {
  return [
    { label: 'Open Project', click: () => ctx.send('open-project', ctx.target?.dataset) },
    { label: 'Rename Project', click: () => ctx.send('rename-project', ctx.target?.dataset) },
  ];
}

if (ctx.target?.classList?.includes('task-row')) {
  return [
    { label: 'Complete Task', click: () => ctx.send('complete-task', ctx.target?.dataset) },
  ];
}
```

You can also open the same configured native context menu from renderer code, for example from a three-dot button:

```typescript
await window.Electron.showContextMenu({
  x: event.clientX,
  y: event.clientY,
  target: {
    classList: ['task-row'],
    dataset: { taskId: task.id },
    text: task.title,
  },
  data: { source: 'overflow-button' },
});
```

Use menu actions when a context menu item should notify the web app:

```typescript
// electron/src/user/menu/context.ts
export function contextMenu(ctx: ContextMenuContext): MenuItemConstructorOptions[] | null {
  return [
    {
      label: 'Open Details',
      click: () => ctx.send('open-details', {
        x: ctx.params.x,
        y: ctx.params.y,
        selectedText: ctx.params.selectionText,
      }),
    },
  ];
}
```

```typescript
// Web app
const unsubscribe = window.Electron.onMenuAction(({ source, action, data }) => {
  if (source === 'context' && action === 'open-details') {
    openDetailsPanel(data);
  }
});

unsubscribe();
```

---

## Dock Menu

Dock menus are macOS-only. Enable them with `ui.dockMenu.enabled`.

```typescript
plugins: {
  Electron: {
    ui: {
      dockMenu: {
        enabled: true,
      },
    },
  },
},
```

| Option | Type | Default | Description |
|---|---|---|---|
| `ui.dockMenu.enabled` | `boolean` | `false` | Read `electron/src/user/menu/dock.ts` and set it as the macOS Dock menu |
| `ui.dockMenu.hideIcon` | `boolean` | `false` | Hide the macOS Dock icon. When hidden, the Dock menu is not visible to the user |

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

`ui.dockMenu.hideIcon: true` hides the Dock icon entirely, so a Dock menu is only useful when the icon remains visible.

---

## Tray Menu

Tray menus are covered in [tray-menu.md](tray-menu.md). They use `ui.trayMenu.enabled` and `electron/src/user/menu/tray.ts`.

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
- `browserWindow.autoHideMenuBar` hides the menu bar on Windows/Linux until the user presses Alt. It works independently of `ui.appMenu`.
- Global keyboard shortcuts are separate from menu accelerators; see [global-shortcuts.md](global-shortcuts.md).
