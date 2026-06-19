// Application menu — edit freely, never overwritten by cap-electron upgrade.
//
// Return a full Electron Menu.buildFromTemplate() template to replace the built-in
// preset. Return null to use the simple ui.menu preset from capacitor.config.ts.

import type { MenuItemConstructorOptions } from 'electron';
import type { MenuContext } from '../../system/static/electron-api/menu-main';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function appMenu(_ctx: MenuContext): MenuItemConstructorOptions[] | null {
  return null;
}
