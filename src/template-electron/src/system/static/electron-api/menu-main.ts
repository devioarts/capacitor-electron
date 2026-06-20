import { app, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import type { ElectronConfig, MenuConfig, MenuActionSource } from '../../shared/types';

export interface MenuContext {
  appName: string;
  isDev: boolean;
  getWin: () => BrowserWindow | null;
  showWindow: () => BrowserWindow | null;
  send: (action: string, data?: unknown) => void;
}

export interface ContextMenuContext extends MenuContext {
  window: BrowserWindow;
  params: Electron.ContextMenuParams;
}

export type ApplicationMenuFactory = (ctx: MenuContext) => MenuItemConstructorOptions[] | null | undefined;
export type ContextMenuFactory = (ctx: ContextMenuContext) => MenuItemConstructorOptions[] | null | undefined;
export type DockMenuFactory = (ctx: MenuContext) => MenuItemConstructorOptions[] | null | undefined;

/**
 * Configure the native application menu (menu bar).
 *
 * - `cfg.ui.menu === undefined` — keeps Electron's default menu unchanged.
 * - `cfg.ui.menu === false` — removes the menu entirely on Windows/Linux; on macOS keeps a
 *   minimal App menu (Quit only) because Cmd+Q must always work.
 * - `cfg.ui.menu === true` or object — uses `src/user/menu/app.ts` when it returns a
 *   template, otherwise falls back to the built-in edit/view preset.
 */
export function setupMenu(
  cfg: ElectronConfig,
  isDev: boolean,
  getWin: () => BrowserWindow | null,
  userMenu?: ApplicationMenuFactory,
): void {
  const menu = cfg.ui?.menu;

  if (menu === undefined) return;

  if (menu === false) {
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(Menu.buildFromTemplate([
        { label: app.name, submenu: [{ role: 'quit' }] },
      ]));
    } else {
      Menu.setApplicationMenu(null);
    }
    return;
  }

  const ctx = menuContext('app', isDev, getWin);
  const customTemplate = userMenu?.(ctx);
  const template = Array.isArray(customTemplate)
    ? customTemplate
    : buildPresetMenu(menu, isDev);

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

export function setupContextMenu(
  win: BrowserWindow,
  cfg: ElectronConfig,
  isDev: boolean,
  getWin: () => BrowserWindow | null,
  userMenu?: ContextMenuFactory,
): void {
  const contextMenu = cfg.ui?.contextMenu;
  const enabled = contextMenu === true || (typeof contextMenu === 'object' && contextMenu.enabled === true);
  if (!enabled || !userMenu) return;

  win.webContents.on('context-menu', (_event, params) => {
    const template = userMenu({ ...menuContext('context', isDev, getWin), window: win, params });
    if (!Array.isArray(template) || template.length === 0) return;
    Menu.buildFromTemplate(template).popup({ window: win });
  });
}

export function setupDockMenu(
  cfg: ElectronConfig,
  isDev: boolean,
  getWin: () => BrowserWindow | null,
  userMenu?: DockMenuFactory,
): void {
  if (process.platform !== 'darwin' || cfg.ui?.dock?.menu !== true || !userMenu) return;

  const template = userMenu(menuContext('dock', isDev, getWin));
  if (!Array.isArray(template) || template.length === 0) return;
  app.dock?.setMenu(Menu.buildFromTemplate(template));
}

export function createMenuContext(source: MenuActionSource, isDev: boolean, getWin: () => BrowserWindow | null): MenuContext {
  const showWindow = (): BrowserWindow | null => {
    const win = getWin();
    if (!win) return null;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return win;
  };

  return {
    appName: app.name,
    isDev,
    getWin,
    showWindow,
    send: (action: string, data?: unknown) => {
      const win = showWindow();
      if (!win) return;
      win.webContents.send('menu:action', { source, action, data });
    },
  };
}

function menuContext(source: MenuActionSource, isDev: boolean, getWin: () => BrowserWindow | null): MenuContext {
  return createMenuContext(source, isDev, getWin);
}

function buildPresetMenu(menu: Exclude<MenuConfig, false>, isDev: boolean): MenuItemConstructorOptions[] {
  const options = typeof menu === 'object' ? menu : {};
  const { editMenu = true, viewMenu } = options;
  const showView = isDev || viewMenu === true;
  const template: MenuItemConstructorOptions[] = [];

  if (process.platform === 'darwin') {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  if (editMenu) template.push({ role: 'editMenu' });
  if (showView) template.push({ role: 'viewMenu' });

  return template;
}
