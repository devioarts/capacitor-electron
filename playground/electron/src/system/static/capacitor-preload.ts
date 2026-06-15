import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { pluginsAuto } from '../generated/plugins-preload-auto';
import { pluginsUser } from '../../user/plugins-preload-user';

type RType = 'promise' | 'callback';
type ListenerFn = (data: unknown) => void;
type PluginEntry = { methods: readonly string[]; events?: readonly string[] };
interface PluginMethod { name: string; rtype: RType }
interface PluginHeader { name: string; methods: PluginMethod[] }

const pluginsSystem: Record<string, PluginEntry> = {
  LocalNotifications: {
    methods: [
      'schedule', 'cancel', 'getPending',
      'getDeliveredNotifications', 'removeDeliveredNotifications', 'removeAllDeliveredNotifications',
      'registerActionTypes', 'checkPermissions', 'requestPermissions',
      'checkExactNotificationSetting', 'changeExactNotificationSetting',
      'areEnabled', 'createChannel', 'deleteChannel', 'listChannels',
    ],
    events: ['localNotificationReceived', 'localNotificationActionPerformed'],
  },
  ActionSheet:  { methods: ['showActions'] },
  Dialog:       { methods: ['alert', 'confirm', 'prompt'] },
  App: {
    methods: ['getInfo', 'getState', 'exitApp', 'minimizeApp', 'getLaunchUrl'],
    events:  ['appStateChange', 'appUrlOpen', 'resume', 'pause', 'backButton'],
  },
  Browser: {
    methods: ['open', 'close', 'getSnapshot'],
    events:  ['browserFinished', 'browserPageLoaded'],
  },
  AppLauncher:  { methods: ['canOpenUrl', 'openUrl'] },
  Filesystem: {
    methods: [
      'readFile', 'writeFile', 'appendFile', 'deleteFile',
      'mkdir', 'rmdir', 'readdir', 'getUri', 'stat',
      'rename', 'copy', 'downloadFile',
    ],
  },
  Preferences: { methods: ['get', 'set', 'remove', 'clear', 'keys', 'migrate', 'removeOld'] },
  Toast:        { methods: ['show'] },
};

const allPlugins: Record<string, PluginEntry> = { ...pluginsSystem, ...pluginsAuto, ...pluginsUser };

const CB_METHODS: PluginMethod[] = [
  { name: 'addListener',        rtype: 'callback' },
  { name: 'removeListener',     rtype: 'callback' },
  { name: 'removeAllListeners', rtype: 'callback' },
];

const PLUGIN_HEADERS: PluginHeader[] = Object.entries(allPlugins).map(([name, entry]) => ({
  name,
  methods: [
    ...entry.methods.map(n => ({ name: n, rtype: 'promise' as RType })),
    ...(entry.events?.length ? CB_METHODS : []),
  ],
}));

// ── Event subscription registry ───────────────────────────────────────────────

const subs = new Map<string, Map<string, ListenerFn>>();

function addSub(pluginName: string, eventName: string, fn: ListenerFn): string {
  const key = `${pluginName}::${eventName}`;
  if (!subs.has(key)) {
    subs.set(key, new Map());
    ipcRenderer.send(`event-add-${pluginName}`, eventName);
    ipcRenderer.on(`event-${pluginName}-${eventName}`, (_: IpcRendererEvent, data: unknown) => {
      subs.get(key)?.forEach(f => f(data));
    });
  }
  const id = `${key}::${Date.now()}-${Math.random().toString(36).slice(2)}`;
  subs.get(key)!.set(id, fn);
  return id;
}

function removeSub(callbackId: string): void {
  const lastSep = callbackId.lastIndexOf('::');
  if (lastSep < 0) return;
  const key = callbackId.slice(0, lastSep);
  const bucket = subs.get(key);
  if (!bucket) return;
  bucket.delete(callbackId);
  if (bucket.size === 0) {
    subs.delete(key);
    const sep = key.indexOf('::');
    ipcRenderer.send(`event-remove-${key.slice(0, sep)}-${key.slice(sep + 2)}`);
  }
}

function removeAllSubs(pluginName: string, eventName?: string): void {
  for (const key of [...subs.keys()]) {
    if (!key.startsWith(`${pluginName}::`)) continue;
    if (eventName && key !== `${pluginName}::${eventName}`) continue;
    subs.delete(key);
    const sep = key.indexOf('::');
    ipcRenderer.send(`event-remove-${key.slice(0, sep)}-${key.slice(sep + 2)}`);
  }
}

// ── Expose bridge ─────────────────────────────────────────────────────────────
//
// Exposed as '_CapElectron' (not 'Capacitor') because contextBridge freezes the
// object and @capacitor/core would throw "Cannot add property Plugins, object is
// not extensible" if we exposed it directly as window.Capacitor.
//
// electron-init.js (injected into index.html by cap-electron copy) reads
// window._CapElectron and creates a plain mutable window.Capacitor with
// PluginHeaders + nativePromise + nativeCallback before @capacitor/core loads.

contextBridge.exposeInMainWorld('_CapElectron', {
  getPluginHeaders: () => PLUGIN_HEADERS,

  invoke: (channel: string, opts: unknown) =>
    ipcRenderer.invoke(channel, opts ?? {}),

  nativeCallback: (
    pluginName: string,
    methodName: string,
    opts: unknown,
    fn: ListenerFn | undefined,
  ) => {
    const o = opts as Record<string, unknown> | undefined;

    if (methodName === 'addListener') {
      const eventName = o?.['eventName'] as string | undefined;
      if (eventName && typeof fn === 'function') return addSub(pluginName, eventName, fn);
      return undefined;
    }

    if (methodName === 'removeListener') {
      const callbackId = o?.['callbackId'] as string | undefined;
      if (callbackId) removeSub(callbackId);
      return undefined;
    }

    if (methodName === 'removeAllListeners') {
      const eventName = o?.['eventName'] as string | undefined;
      removeAllSubs(pluginName, eventName);
      return undefined;
    }

    return undefined;
  },
});
