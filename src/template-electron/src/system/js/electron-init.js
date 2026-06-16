/**
 * NON-CRITICAL PATH — injected into index.html as a synchronous <script> so it
 * runs before <script type="module"> (which loads @capacitor/core).
 *
 * Responsibilities:
 *   1. Read window.CapacitorCustomPlatform that plugins-preload.ts already set via
 *      contextBridge (contains third-party plugin bridges — TCPClient, etc.).
 *   2. Add built-in Capacitor plugin bridges (App, ActionSheet, …) on top.
 *   3. Write the merged object back as window.CapacitorCustomPlatform.
 *   4. Set up window.Capacitor so @capacitor/core can route calls through IPC
 *      (PluginHeaders + nativePromise + nativeCallback).
 *
 * Fault-isolation guarantee:
 *   Third-party plugins go through plugins-preload.ts (contextBridge, preload).
 *   Even if this script throws, window.CapacitorCustomPlatform from the preload
 *   remains intact and those plugins keep working.  Only the built-in Capacitor
 *   plugins and the new-style PluginHeaders routing are affected by a failure here.
 *
 * Built-in plugins are defined statically (not generated) — they change only when
 * the supported @capacitor/* package set changes, which is rare and deliberate.
 *
 * Injection:
 *   Production  — cap-electron copy writes it to electron/app/ and injects the
 *                 <script> tag into app/index.html.
 *   Development — cap-electron copy writes it to public/electron-init.js and
 *                 injects the <script> tag into the root index.html so the Vite
 *                 dev server serves it at /electron-init.js.
 */
(function () {
  var b = window._CapElectron;
  if (!b) return;

  // ── Read third-party plugins from preload (contextBridge, frozen proxy) ─────
  //
  // Save a reference BEFORE we overwrite window.CapacitorCustomPlatform.
  // Object.assign can read from a frozen object just fine.
  var prevPlugins = (window.CapacitorCustomPlatform && window.CapacitorCustomPlatform.plugins) || {};

  // ── Built-in Capacitor plugin bridges (static) ────────────────────────────
  //
  // Each entry mirrors the ipcMain.handle registrations in capacitor-api/*-main.ts.
  // Methods:  opts → ipcRenderer.invoke via _CapElectron.invoke
  // Events:   addListener / removeListener / removeAllListeners via nativeCallback

  function mk(name, methods, hasEvents) {
    var o = {};
    for (var i = 0; i < methods.length; i++) {
      (function (m) {
        o[m] = function (opts) { return b.invoke(name + '-' + m, opts); };
      })(methods[i]);
    }
    if (hasEvents) {
      (function (n) {
        o.addListener = function (ev, fn) {
          return b.nativeCallback(n, 'addListener', { eventName: ev }, fn);
        };
        o.removeListener = function (id) {
          b.nativeCallback(n, 'removeListener', { callbackId: id }, undefined);
        };
        o.removeAllListeners = function (ev) {
          b.nativeCallback(n, 'removeAllListeners', ev ? { eventName: ev } : undefined, undefined);
        };
      })(name);
    }
    return o;
  }

  var BUILTIN = {
    // @capacitor/app
    App: mk('App', ['getInfo', 'getState', 'exitApp', 'minimizeApp', 'getLaunchUrl'], true),
    // @capacitor/action-sheet
    ActionSheet: mk('ActionSheet', ['showActions'], false),
    // @capacitor/dialog
    Dialog: mk('Dialog', ['alert', 'confirm', 'prompt'], false),
    // @capacitor/browser
    Browser: mk('Browser', ['open', 'close', 'getSnapshot'], true),
    // @capacitor/app-launcher
    AppLauncher: mk('AppLauncher', ['canOpenUrl', 'openUrl'], false),
    // @capacitor/filesystem
    Filesystem: mk('Filesystem', [
      'readFile', 'writeFile', 'appendFile', 'deleteFile',
      'mkdir', 'rmdir', 'readdir', 'getUri', 'stat',
      'rename', 'copy', 'downloadFile',
    ], false),
    // @capacitor/preferences
    Preferences: mk('Preferences', ['get', 'set', 'remove', 'clear', 'keys', 'migrate', 'removeOld'], false),
    // @capacitor/toast
    Toast: mk('Toast', ['show'], false),
    // @capacitor/local-notifications
    LocalNotifications: mk('LocalNotifications', [
      'schedule', 'cancel', 'getPending',
      'getDeliveredNotifications', 'removeDeliveredNotifications', 'removeAllDeliveredNotifications',
      'registerActionTypes',
      'checkPermissions', 'requestPermissions',
      'checkExactNotificationSetting', 'changeExactNotificationSetting',
      'areEnabled',
      'createChannel', 'deleteChannel', 'listChannels',
    ], true),
  };

  // ── Atomic merge & write ──────────────────────────────────────────────────
  //
  // prevPlugins (third-party, from preload) merged with BUILTIN.
  // BUILTIN intentionally does NOT override prevPlugins keys so a third-party
  // plugin cannot accidentally shadow a built-in.

  window.CapacitorCustomPlatform = {
    name: 'electron',
    plugins: Object.assign({}, BUILTIN, prevPlugins),
  };

  // ── window.Capacitor — needed by @capacitor/core for new-style routing ────
  //
  // PluginHeaders tells core which plugins are available natively so it can
  // route calls through nativePromise / nativeCallback instead of the web impl.
  // This covers both built-in plugins and any third-party plugins that do NOT
  // use the `electron:` factory key in registerPlugin.

  window.Capacitor = {
    PluginHeaders: b.getPluginHeaders(),
    nativePromise: function (p, m, o) { return b.invoke(p + '-' + m, o); },
    nativeCallback: function (p, m, o, fn) { return b.nativeCallback(p, m, o, fn); },
  };
})();
