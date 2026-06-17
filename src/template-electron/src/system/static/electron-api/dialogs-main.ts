import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';

function owner(e: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(e.sender) ?? undefined;
}

ipcMain.handle('dialogs:showOpenDialog', (e, options: Electron.OpenDialogOptions) =>
  owner(e) ? dialog.showOpenDialog(owner(e)!, options ?? {}) : dialog.showOpenDialog(options ?? {}));

ipcMain.handle('dialogs:showSaveDialog', (e, options: Electron.SaveDialogOptions) =>
  owner(e) ? dialog.showSaveDialog(owner(e)!, options ?? {}) : dialog.showSaveDialog(options ?? {}));

ipcMain.handle('dialogs:showMessageBox', (e, options: Electron.MessageBoxOptions) =>
  owner(e) ? dialog.showMessageBox(owner(e)!, options ?? { message: '' }) : dialog.showMessageBox(options ?? { message: '' }));

ipcMain.handle('dialogs:showErrorBox', (_e, options: { title?: string; content?: string }) => {
  dialog.showErrorBox(options?.title ?? 'Error', options?.content ?? '');
});
