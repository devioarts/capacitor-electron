// Mock for electron-updater — used via vitest.config resolve.alias so that
// both the test files and template-electron source files get the same object.
// Tests import this file directly to reset spies between tests.

export const autoUpdater = {
  channel: 'latest',
  autoDownload: false,
  autoInstallOnAppQuit: true,
  allowPrerelease: false,
  allowDowngrade: false,
  on: (..._: unknown[]) => autoUpdater,
  checkForUpdates: async () => {},
  downloadUpdate: async () => {},
  quitAndInstall: () => {},
};
