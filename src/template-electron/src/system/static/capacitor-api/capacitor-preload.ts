/**
 * Exposes window._CapElectron via contextBridge — the raw IPC bridge used by
 * electron-init.js to set up window.Capacitor in the renderer.
 *
 * _CapElectron provides:
 *   getPluginHeaders() — list of third-party plugins (auto + user) for
 *                        window.Capacitor.PluginHeaders.  Built-in Capacitor
 *                        plugins (App, ActionSheet, …) are NOT listed here;
 *                        they are defined statically in electron-init.js.
 *   getBuiltinCapacitorConfig()
 *                      — sync config snapshot for built-in Capacitor plugin switches.
 *   invoke()          — calls ipcMain.handle('PluginName-method', opts)
 *   nativeCallback()  — manages addListener / removeListener / removeAllListeners
 *                        for event-based plugins routed through PluginHeaders.
 *
 * Why '_CapElectron' and not 'Capacitor':
 *   contextBridge freezes the exposed object.  @capacitor/core needs to add
 *   Capacitor.Plugins = {} at runtime, which would throw on a frozen object.
 *   electron-init.js therefore reads _CapElectron and creates a plain mutable
 *   window.Capacitor that core can freely extend.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { pluginsAuto } from '../../generated/plugins-preload-auto';
import { pluginsUser } from '../../../user/plugins-preload-user';

type RType = 'promise' | 'callback';
type ListenerFn = (data: unknown) => void;
type PluginEntry = { methods: readonly string[]; events?: readonly string[] };
type BuiltinCapacitorConfig = { preferences: boolean };
type CapacitorFileSrcConfig = {
  enabled: boolean;
  roots: {
    name: string;
    fileUrlPrefix: string;
    urlPrefix: string;
  }[];
};
interface PluginMethod { name: string; rtype: RType }
interface PluginHeader { name: string; methods: PluginMethod[] }
interface PluginErrorPayload {
  code?: string;
  message?: string;
  platform?: string;
  method?: string;
  details?: unknown;
}
interface PluginFailureResult {
  success: false;
  error?: PluginErrorPayload;
}

// Only third-party plugins belong in PluginHeaders here.
// Built-in Capacitor plugins are handled by electron-init.js (static, non-critical path).
const allPlugins: Record<string, PluginEntry> = { ...pluginsAuto, ...pluginsUser };

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

function getBuiltinCapacitorConfig(): BuiltinCapacitorConfig {
  try {
    const cfg = ipcRenderer.sendSync('CapElectron-getBuiltinCapacitorConfig') as Partial<BuiltinCapacitorConfig> | undefined;

    return {
      preferences: cfg?.preferences !== false,
    };
  } catch {
    return { preferences: true };
  }
}

const BUILTIN_CAPACITOR_CONFIG = getBuiltinCapacitorConfig();

function getCapacitorFileSrcConfig(): CapacitorFileSrcConfig {
  try {
    const cfg = ipcRenderer.sendSync('CapElectron-getCapacitorFileSrcConfig') as Partial<CapacitorFileSrcConfig> | undefined;
    const roots = Array.isArray(cfg?.roots)
      ? cfg.roots.filter((root): root is CapacitorFileSrcConfig['roots'][number] =>
        typeof root?.name === 'string'
        && typeof root.fileUrlPrefix === 'string'
        && typeof root.urlPrefix === 'string')
      : [];

    return {
      enabled: cfg?.enabled === true,
      roots,
    };
  } catch {
    return { enabled: false, roots: [] };
  }
}

const CAPACITOR_FILE_SRC_CONFIG = getCapacitorFileSrcConfig();

function isPluginFailureResult(value: unknown): value is PluginFailureResult {
  return typeof value === 'object'
    && value !== null
    && (value as { success?: unknown }).success === false;
}

function pluginFailureToError(result: PluginFailureResult): Error {
  const payload = result.error ?? {};
  const err = new Error(payload.message ?? 'Capacitor Electron plugin call failed') as Error & {
    code?: string;
    platform?: string;
    method?: string;
    details?: unknown;
  };
  if (payload.code) err.code = payload.code;
  if (payload.platform) err.platform = payload.platform;
  if (payload.method) err.method = payload.method;
  if (payload.details !== undefined) err.details = payload.details;
  return err;
}

async function invokePlugin(channel: string, opts: unknown): Promise<unknown> {
  const result = await ipcRenderer.invoke(channel, opts ?? {});
  // registerPlugin() returns structured failures so the main process can attach
  // Capacitor-style metadata. Renderer callers should still see a normal
  // rejected promise, consistent with window.Electron.* methods.
  if (isPluginFailureResult(result)) throw pluginFailureToError(result);
  return result;
}

// ── Event subscription registry ───────────────────────────────────────────────

const subs        = new Map<string, Map<string, ListenerFn>>();
const ipcListeners = new Map<string, (_: IpcRendererEvent, data: unknown) => void>();

function ipcChannel(key: string): string {
  const sep = key.indexOf('::');
  return `event-${key.slice(0, sep)}-${key.slice(sep + 2)}`;
}

function addSub(pluginName: string, eventName: string, fn: ListenerFn): string {
  const key = `${pluginName}::${eventName}`;
  if (!subs.has(key)) {
    subs.set(key, new Map());
    ipcRenderer.send(`event-add-${pluginName}`, eventName);
    const listener = (_: IpcRendererEvent, data: unknown) => {
      subs.get(key)?.forEach(f => f(data));
    };
    ipcListeners.set(key, listener);
    ipcRenderer.on(ipcChannel(key), listener);
  }
  const id = `${key}::${Date.now()}-${Math.random().toString(36).slice(2)}`;
  subs.get(key)!.set(id, fn);
  return id;
}

function teardownKey(key: string): void {
  const listener = ipcListeners.get(key);
  if (listener) {
    ipcRenderer.removeListener(ipcChannel(key), listener);
    ipcListeners.delete(key);
  }
  ipcRenderer.send(`event-remove-${ipcChannel(key).slice('event-'.length)}`);
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
    teardownKey(key);
  }
}

function removeAllSubs(pluginName: string, eventName?: string): void {
  for (const key of [...subs.keys()]) {
    if (!key.startsWith(`${pluginName}::`)) continue;
    if (eventName && key !== `${pluginName}::${eventName}`) continue;
    subs.delete(key);
    teardownKey(key);
  }
}

// ── Expose bridge ─────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('_CapElectron', {
  getPluginHeaders: () => PLUGIN_HEADERS,
  getBuiltinCapacitorConfig: () => BUILTIN_CAPACITOR_CONFIG,
  getCapacitorFileSrcConfig: () => CAPACITOR_FILE_SRC_CONFIG,

  invoke: (channel: string, opts: unknown) =>
    invokePlugin(channel, opts),

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
