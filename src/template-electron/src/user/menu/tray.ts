// Tray menu — edit freely, never overwritten by cap-electron upgrade.
//
// Only used when ui.tray.enabled is true in capacitor.config.ts.
// Return a normal Electron Menu.buildFromTemplate() template.

import { app, type MenuItemConstructorOptions } from 'electron';
import type { TrayMenuContext } from '../../system/static/electron-api/tray-main';

export function trayMenu(ctx: TrayMenuContext): MenuItemConstructorOptions[] {
  return [
    {
      label: 'Open',
      click: () => {
        const win = ctx.getWin();
        if (!win) return;
        win.show();
        win.focus();
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ];
}
