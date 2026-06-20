// Renderer context menu — edit freely, never overwritten by cap-electron upgrade.
//
// Only used when ui.contextMenu.enabled is true in capacitor.config.ts.
// Return null to show no menu for the current right-click.

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
    { label: 'Open Settings', click: () => ctx.send('open-settings') },
    ...(ctx.isDev
      ? [{
        label: 'Inspect Element',
        click: () => ctx.window.webContents.inspectElement(ctx.params.x, ctx.params.y),
      } satisfies MenuItemConstructorOptions]
      : []),
  ];
}
