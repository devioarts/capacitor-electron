(function () {
  var b = window._CapElectron;
  if (!b) return;
  window.CapacitorCustomPlatform = { name: 'electron' };
  window.Capacitor = {
    PluginHeaders: b.getPluginHeaders(),
    nativePromise: function (p, m, o) { return b.invoke(p + '-' + m, o); },
    nativeCallback: function (p, m, o, fn) { return b.nativeCallback(p, m, o, fn); },
  };
})();
