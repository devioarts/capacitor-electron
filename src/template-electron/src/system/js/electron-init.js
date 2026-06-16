/**
 * NON-CRITICAL PATH — injected into index.html as a synchronous <script> so it
 * runs before <script type="module"> (which loads @capacitor/core).
 *
 * Responsibilities:
 *   1. Preserve third-party plugin bridges already set on window.CapacitorCustomPlatform
 *      by plugins-preload.ts via contextBridge (e.g. plugins using the 'electron:' factory).
 *   2. Write window.CapacitorCustomPlatform = { name: 'electron', plugins: <preserved> }
 *      so Capacitor.getPlatform() returns 'electron' and third-party plugin bridges survive.
 *   3. Register built-in Capacitor plugin PluginHeaders so @capacitor/core routes their
 *      calls through nativePromise/nativeCallback (→ IPC) instead of falling back to the
 *      web implementation.
 *   4. Append third-party plugin headers from _CapElectron.getPluginHeaders() so plugins
 *      that do NOT use the 'electron:' factory key are also routed natively.
 *
 * Two routing paths in Capacitor 6+:
 *   a) PluginHeaders + nativePromise/nativeCallback — used by built-in @capacitor/* plugins
 *      and third-party plugins that declare PluginHeaders in their preload.
 *   b) CapacitorCustomPlatform.plugins — used by third-party plugins that register with
 *      the 'electron:' factory key in registerPlugin.
 *   Both paths must be populated; this script handles both.
 *
 * Injection:
 *   Development  — cap-electron update writes it to public/electron-init.js and
 *                  injects the <script> tag into the root index.html so the Vite
 *                  dev server serves it at /electron-init.js.
 *   Production   — cap-electron copy writes it to electron/app/ and injects the
 *                  <script> tag into app/index.html.
 */
(function () {
  var b = window._CapElectron;
  if (!b) return;

  var builtinConfig = typeof b.getBuiltinCapacitorConfig === 'function'
    ? b.getBuiltinCapacitorConfig()
    : {};

  // Preserve third-party plugin bridges set by plugins-preload.ts via contextBridge.
  // Must be read BEFORE we overwrite window.CapacitorCustomPlatform below.
  var prevPlugins = (window.CapacitorCustomPlatform && window.CapacitorCustomPlatform.plugins) || {};

  // Mark this as the electron platform and keep third-party bridges intact.
  window.CapacitorCustomPlatform = { name: 'electron', plugins: prevPlugins };

  // ── Build a PluginHeader entry ─────────────────────────────────────────────
  //
  // Methods list must match the ipcMain.handle registrations in *-main.ts.
  // hasEvents = true adds addListener / removeListener / removeAllListeners
  // (callback rtype) which route through nativeCallback → IPC event channels.

  function ph(name, methods, hasEvents) {
    var m = methods.map(function (n) { return { name: n, rtype: 'promise' }; });
    if (hasEvents) m = m.concat([
      { name: 'addListener',        rtype: 'callback' },
      { name: 'removeListener',     rtype: 'callback' },
      { name: 'removeAllListeners', rtype: 'callback' },
    ]);
    return { name: name, methods: m };
  }

  // ── Built-in Capacitor plugin headers (static) ────────────────────────────

  var BUILTIN = [
    ph('App',         ['getInfo','getState','exitApp','minimizeApp','getLaunchUrl'], true),
    ph('ActionSheet', ['showActions'], false),
    ph('Dialog',      ['alert','confirm','prompt'], false),
    ph('Browser',     ['open','close','getSnapshot'], true),
    ph('AppLauncher', ['canOpenUrl','openUrl'], false),
    ph('Filesystem',  [
      'readFile','writeFile','appendFile','deleteFile',
      'mkdir','rmdir','readdir','getUri','stat',
      'rename','copy','downloadFile',
    ], false),
    ph('Preferences', ['get','set','remove','clear','keys','migrate','removeOld'], false),
    ph('Toast',       ['show'], false),
    ph('LocalNotifications', [
      'schedule','cancel','getPending',
      'getDeliveredNotifications','removeDeliveredNotifications','removeAllDeliveredNotifications',
      'registerActionTypes',
      'checkPermissions','requestPermissions',
      'checkExactNotificationSetting','changeExactNotificationSetting',
      'areEnabled',
      'createChannel','deleteChannel','listChannels',
    ], true),
  ];

  if (builtinConfig.preferences === false) {
    BUILTIN = BUILTIN.filter(function (p) { return p.name !== 'Preferences'; });
  }

  // ── window.Capacitor ──────────────────────────────────────────────────────
  //
  // PluginHeaders = built-in headers + third-party headers from preload.
  // nativePromise  → ipcMain.handle(`${plugin}-${method}`, opts)
  // nativeCallback → addListener/removeListener via IPC event channels

  window.Capacitor = {
    PluginHeaders:  BUILTIN.concat(b.getPluginHeaders()),
    nativePromise:  function (p, m, o) { return b.invoke(p + '-' + m, o); },
    nativeCallback: function (p, m, o, fn) { return b.nativeCallback(p, m, o, fn); },
  };
})();
