import type { PluginSettings } from '@devioarts/capacitor-electron';

export const pluginSettings: PluginSettings = {
  // Must match the class name exported from __PACKAGE_NAME__/electron
  // AND the Capacitor registration name.
  pluginClass: '__PLUGIN_CLASS__',

  // Methods that get an ipcMain.handle() bridge — must match class method names
  pluginMethods: ['echo', 'getDataPath'],

  // Events emitted from the main process to the renderer (optional)
  pluginEvents: [],

  // Set to false only if you need manual wiring in electron-main-user.ts.
  // Default (omit this field): auto-registered by cap-electron sync.
  // autoRegister: false,

  // If your plugin reads its own section from capacitor.config (e.g. plugins.__PLUGIN_CLASS__)
  // list the section name(s) here so cap-electron sync copies them automatically.
  // Users do not need to configure anything — the sync script picks this up from every
  // installed plugin and merges all declared sections into electron/capacitor.config.json.
  // configSections: ['__PLUGIN_CLASS__'],
};
