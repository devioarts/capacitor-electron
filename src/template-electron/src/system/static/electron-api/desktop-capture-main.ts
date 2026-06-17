import { desktopCapturer, ipcMain } from 'electron';

ipcMain.handle('desktopCapture:getSources', async (_e, opts: {
  types?: Array<'window' | 'screen'>;
  thumbnailSize?: { width: number; height: number };
  fetchWindowIcons?: boolean;
}) => {
  const sources = await desktopCapturer.getSources({
    types: opts?.types ?? ['window', 'screen'],
    thumbnailSize: opts?.thumbnailSize ?? { width: 320, height: 180 },
    fetchWindowIcons: opts?.fetchWindowIcons ?? true,
  });

  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    display_id: source.display_id,
    appIcon: source.appIcon?.isEmpty() ? undefined : source.appIcon?.toDataURL(),
    thumbnail: source.thumbnail.isEmpty() ? undefined : source.thumbnail.toDataURL(),
  }));
});
