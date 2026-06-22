// Lightweight Electron mock for Vitest — provides the symbols imported by
// template-electron source files so they can run in a plain Node environment.

export const app = {
  isPackaged: false,
  getVersion: () => '42.0.0',
  getPath: (name: string) => `/mock-user-data/${name}`,
  getName: () => 'TestApp',
  on: () => app,
  once: () => app,
  quit: () => {},
  getBadgeCount: () => 0,
  setBadgeCount: () => true,
  getLoginItemSettings: () => ({ openAtLogin: false }),
  setLoginItemSettings: () => {},
  isDefaultProtocolClient: () => false,
  setAsDefaultProtocolClient: () => true,
  removeAsDefaultProtocolClient: () => true,
  whenReady: () => Promise.resolve(),
};

export class BrowserWindow {
  static getAllWindows(): BrowserWindow[] { return []; }
  static fromWebContents(): BrowserWindow | null { return null; }
  id = 0;
  webContents = { send: () => {}, id: 0, getURL: () => '' };
  isDestroyed() { return false; }
  isMaximized() { return false; }
  isFullScreen() { return false; }
  isFocused() { return false; }
  isMinimized() { return false; }
  isVisible() { return true; }
  maximize() {}
  unmaximize() {}
  minimize() {}
  focus() {}
  close() {}
  show() {}
  hide() {}
  reload() {}
  setFullScreen() {}
  getTitle() { return ''; }
  loadURL() { return Promise.resolve(); }
  loadFile() { return Promise.resolve(); }
  on() { return this; }
  once() { return this; }
  getContentSize(): [number, number] { return [800, 600]; }
  getBounds() { return { x: 0, y: 0, width: 800, height: 600 }; }
  getNormalBounds() { return { x: 0, y: 0, width: 800, height: 600 }; }
  setBounds() {}
  contentView = { addChildView: () => {} };
}

type MockIpcHandler = (event: unknown, ...args: unknown[]) => unknown;
const ipcHandlers = new Map<string, MockIpcHandler>();

export const ipcMain = {
  handle: (channel: string, handler: MockIpcHandler) => {
    ipcHandlers.set(channel, handler);
  },
  on: () => {},
  removeHandler: (channel: string) => {
    ipcHandlers.delete(channel);
  },
  __handlers: ipcHandlers,
  __reset: () => {
    ipcHandlers.clear();
  },
};

export const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (s: string) => Buffer.from(s),
  decryptString: (b: Buffer) => b.toString(),
};

export const net = {
  isOnline: () => true,
  fetch: async (_url: string) => new Response(''),
};

export const nativeTheme = {
  themeSource: 'system' as const,
  shouldUseDarkColors: false,
  shouldUseHighContrastColors: false,
  shouldUseInvertedColorScheme: false,
  on: () => {},
};

export const screen = {
  getAllDisplays: () => [],
  getPrimaryDisplay: () => ({}),
  getCursorScreenPoint: () => ({ x: 0, y: 0 }),
  on: () => {},
};

export const shell = {
  openExternal: async (_url: string) => {},
  openPath: async (_path: string) => '',
};

export const session = {
  defaultSession: { clearCache: async () => {}, cookies: { get: async () => [] } },
  fromPartition: (_p: string) => session.defaultSession,
};

export const protocol = {
  isProtocolHandled: (_s: string) => false,
  registerSchemesAsPrivileged: () => {},
  handle: () => {},
};

export const powerMonitor = {
  getSystemIdleState: (_s: number) => 'active' as const,
  getSystemIdleTime: () => 0,
  on: () => {},
};

export const powerSaveBlocker = {
  start: (_type: string) => 0,
  stop: (_id: number) => {},
  isStarted: (_id: number) => false,
};

export const desktopCapturer = {
  getSources: async (_opts: unknown) => [],
};

export const globalShortcut = {
  register: () => true,
  unregister: () => {},
  isRegistered: () => false,
};

export const dialog = {
  showOpenDialog: async () => ({ canceled: false, filePaths: [] }),
  showSaveDialog: async () => ({ canceled: false, filePath: '' }),
  showMessageBox: async () => ({ response: 0 }),
  showErrorBox: () => {},
};

export class Menu {
  static buildFromTemplate(_t: unknown) { return new Menu(); }
  static setApplicationMenu() {}
  popup() {}
}
export class MenuItem {}
export class Tray {
  on() { return this; }
  setContextMenu() {}
  setToolTip() {}
}
export class WebContentsView {
  webContents = {
    loadURL: async () => {},
    getURL: () => '',
    canGoBack: () => false,
    canGoForward: () => false,
    goBack: () => {},
    goForward: () => {},
    reload: () => {},
    setWindowOpenHandler: () => {},
    on: () => {},
    once: () => {},
    setUserAgent: () => {},
    executeJavaScript: async () => {},
    getPrintersAsync: async () => [],
    print: () => {},
    printToPDF: async () => Buffer.alloc(0),
    id: 1,
  };
  setBounds() {}
}
type MockNativeImage = {
  dataUrl: string;
  isEmpty: () => boolean;
  toDataURL: () => string;
  getSize: () => { width: number; height: number };
};

function makeNativeImage(dataUrl = ''): MockNativeImage {
  return {
    dataUrl,
    isEmpty: () => dataUrl === '',
    toDataURL: () => dataUrl,
    getSize: () => dataUrl === '' ? { width: 0, height: 0 } : { width: 1, height: 1 },
  };
}

let clipboardText = '';
let clipboardImage = makeNativeImage();

export const clipboard = {
  write: (data: { text?: string; image?: MockNativeImage }) => {
    clipboardText = data.text ?? '';
    clipboardImage = data.image ?? makeNativeImage();
  },
  writeImage: (image: MockNativeImage) => {
    clipboardImage = image;
  },
  writeText: (text: string) => {
    clipboardText = text;
    clipboardImage = makeNativeImage();
  },
  readImage: () => clipboardImage,
  readText: () => clipboardText,
  __reset: () => {
    clipboardText = '';
    clipboardImage = makeNativeImage();
  },
};

export const nativeImage = {
  createEmpty: () => makeNativeImage(),
  createFromPath: (_path: string) => makeNativeImage('mock:path'),
  createFromDataURL: (dataUrl: string) => (
    typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')
      ? makeNativeImage(dataUrl)
      : makeNativeImage()
  ),
};

type NotifOpts = { title: string; body?: string; silent?: boolean };
type NotifEventMap = {
  show: () => void;
  click: () => void;
  failed: (_e: unknown, err: string) => void;
};

export class Notification {
  static isSupported: () => boolean = () => true;
  title: string;
  body: string;
  private _listeners: Partial<NotifEventMap> = {};
  constructor(opts: NotifOpts) {
    this.title = opts.title;
    this.body = opts.body ?? '';
  }
  on<K extends keyof NotifEventMap>(event: K, fn: NotifEventMap[K]) {
    this._listeners[event] = fn;
    return this;
  }
  show() {
    this._listeners.show?.();
  }
}
