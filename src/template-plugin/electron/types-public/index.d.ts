// Public type declarations for the Electron entry point.
// Users import types from '__PACKAGE_NAME__/electron'.
// Keep in sync with electron/src/index.ts.

export interface EchoOptions {
  value: string;
}

export declare class __PLUGIN_CLASS__ {
  static readonly pluginMethods: readonly string[];
  echo(opts: EchoOptions): Promise<{ value: string }>;
  getDataPath(): Promise<{ path: string }>;
}
