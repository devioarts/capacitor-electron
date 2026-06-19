// macOS Dock menu — edit freely, never overwritten by cap-electron upgrade.
//
// Only used on macOS when ui.dock.menu is true in capacitor.config.ts.
// Return null to show no custom Dock menu.

import type { MenuItemConstructorOptions } from 'electron';
import type { MenuContext } from '../../system/static/electron-api/menu-main';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dockMenu(_ctx: MenuContext): MenuItemConstructorOptions[] | null {
  return null;
}
