// Renderer context menu — edit freely, never overwritten by cap-electron upgrade.
//
// Only used when ui.contextMenu is enabled in capacitor.config.ts.
// Return null to show no menu for the current right-click.

import type { MenuItemConstructorOptions } from 'electron';
import type { ContextMenuContext } from '../../system/static/electron-api/menu-main';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function contextMenu(_ctx: ContextMenuContext): MenuItemConstructorOptions[] | null {
  return null;
}
