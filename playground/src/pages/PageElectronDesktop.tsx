import React, { useEffect, useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronDesktop: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [key, setKey] = useState("token");
  const [secret, setSecret] = useState("desktop-secret");
  const [downloadUrl, setDownloadUrl] = useState("https://capacitorjs.com/");
  const [activeDownloadId, setActiveDownloadId] = useState("");
  const [pdfPath, setPdfPath] = useState("");
  const [windowUrl, setWindowUrl] = useState("https://capacitorjs.com/");
  const [lastWindowId, setLastWindowId] = useState<number | null>(null);
  const [protocolScheme, setProtocolScheme] = useState("capelectron");
  const [cookieUrl, setCookieUrl] = useState("https://capacitorjs.com/");
  const [cookieName, setCookieName] = useState("cap-electron-test");
  const [cookieValue, setCookieValue] = useState("ok");
  const [proxyRules, setProxyRules] = useState("");

  useEffect(() => {
    const offDownload = window.Electron.downloads.on((event) => info("Downloads", event.type, event.data));
    const offTheme = window.Electron.nativeTheme.onUpdated((data) => info("NativeTheme", "updated", data));
    return () => { offDownload(); offTheme(); };
  }, [info]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Native dialogs</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { log.info("Dialogs", "showOpenDialog", await window.Electron.dialogs.showOpenDialog({ properties: ["openFile", "multiSelections"] })); }
            catch (e) { log.error("Dialogs", "showOpenDialog", e); }
          }}>
            showOpenDialog()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Dialogs", "showSaveDialog", await window.Electron.dialogs.showSaveDialog({ defaultPath: "cap-electron.txt" })); }
            catch (e) { log.error("Dialogs", "showSaveDialog", e); }
          }}>
            showSaveDialog()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Dialogs", "showMessageBox", await window.Electron.dialogs.showMessageBox({ type: "info", message: "Hello from window.Electron.dialogs" })); }
            catch (e) { log.error("Dialogs", "showMessageBox", e); }
          }}>
            showMessageBox()
          </Button>
          <Button type="red" onClick={async () => {
            try { await window.Electron.dialogs.showErrorBox({ title: "Test error box", content: "This is a test error dialog." }); log.info("Dialogs", "showErrorBox", "shown"); }
            catch (e) { log.error("Dialogs", "showErrorBox", e); }
          }}>
            showErrorBox()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Secure storage</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Label label="Key"><Input value={key} onChange={(e) => setKey(e.target.value)} /></Label>
          <Label label="Value"><Input value={secret} onChange={(e) => setSecret(e.target.value)} /></Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { await window.Electron.secureStorage.set(key, secret); log.info("SecureStorage", "set", { key }); }
            catch (e) { log.error("SecureStorage", "set", e); }
          }}>
            set()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("SecureStorage", "get", await window.Electron.secureStorage.get(key)); }
            catch (e) { log.error("SecureStorage", "get", e); }
          }}>
            get()
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              log.info("SecureStorage", "status", {
                available: await window.Electron.secureStorage.isEncryptionAvailable(),
                backend: await window.Electron.secureStorage.getSelectedStorageBackend(),
                keys: await window.Electron.secureStorage.keys(),
              });
            } catch (e) { log.error("SecureStorage", "status", e); }
          }}>
            status()
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              const encrypted = await window.Electron.secureStorage.encryptString(secret);
              log.info("SecureStorage", "encrypt/decrypt", {
                encrypted,
                decrypted: await window.Electron.secureStorage.decryptString(encrypted),
              });
            } catch (e) { log.error("SecureStorage", "encrypt/decrypt", e); }
          }}>
            encrypt/decrypt()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.secureStorage.remove(key); log.info("SecureStorage", "remove", { key }); }
            catch (e) { log.error("SecureStorage", "remove", e); }
          }}>
            remove()
          </Button>
          <Button type="red" onClick={async () => {
            try { await window.Electron.secureStorage.clear(); log.info("SecureStorage", "clear", "done"); }
            catch (e) { log.error("SecureStorage", "clear", e); }
          }}>
            clear()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Protocols</p>
        <Label label="Scheme">
          <Input value={protocolScheme} onChange={(e) => setProtocolScheme(e.target.value)} />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { log.info("Protocols", "configured", await window.Electron.protocols.getConfiguredSchemes()); }
            catch (e) { log.error("Protocols", "configured", e); }
          }}>
            configured schemes
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              log.info("Protocols", "status", {
                handled: await window.Electron.protocols.isProtocolHandled(protocolScheme),
                defaultClient: await window.Electron.protocols.isDefaultProtocolClient(protocolScheme),
              });
            } catch (e) { log.error("Protocols", "status", e); }
          }}>
            status()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { log.info("Protocols", "set default", await window.Electron.protocols.setAsDefaultProtocolClient(protocolScheme)); }
            catch (e) { log.error("Protocols", "set default", e); }
          }}>
            set default
          </Button>
          <Button type="yellow" onClick={async () => {
            try { log.info("Protocols", "remove default", await window.Electron.protocols.removeAsDefaultProtocolClient(protocolScheme)); }
            catch (e) { log.error("Protocols", "remove default", e); }
          }}>
            remove default
          </Button>
          <Button type="neutral" onClick={async () => {
            try { await window.Electron.protocols.openExternal(`${protocolScheme}://test/from-playground`); log.info("Protocols", "openExternal", protocolScheme); }
            catch (e) { log.error("Protocols", "openExternal", e); }
          }}>
            openExternal()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Session</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Label label="Cookie URL"><Input value={cookieUrl} onChange={(e) => setCookieUrl(e.target.value)} /></Label>
          <Label label="Cookie name"><Input value={cookieName} onChange={(e) => setCookieName(e.target.value)} /></Label>
          <Label label="Cookie value"><Input value={cookieValue} onChange={(e) => setCookieValue(e.target.value)} /></Label>
          <Label label="Proxy rules"><Input value={proxyRules} onChange={(e) => setProxyRules(e.target.value)} placeholder="http=127.0.0.1:8080" /></Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="neutral" onClick={async () => {
            try { log.info("Session", "userAgent", await window.Electron.session.getUserAgent()); }
            catch (e) { log.error("Session", "userAgent", e); }
          }}>
            getUserAgent()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.session.clearCache(); log.info("Session", "clearCache", "done"); }
            catch (e) { log.error("Session", "clearCache", e); }
          }}>
            clearCache()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.session.clearStorageData(); log.info("Session", "clearStorageData", "done"); }
            catch (e) { log.error("Session", "clearStorageData", e); }
          }}>
            clearStorageData()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { await window.Electron.session.setCookie({ url: cookieUrl, name: cookieName, value: cookieValue }); log.info("Session", "setCookie", { cookieUrl, cookieName }); }
            catch (e) { log.error("Session", "setCookie", e); }
          }}>
            setCookie()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Session", "getCookies", await window.Electron.session.getCookies({ url: cookieUrl })); }
            catch (e) { log.error("Session", "getCookies", e); }
          }}>
            getCookies()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.session.removeCookie({ url: cookieUrl, name: cookieName }); log.info("Session", "removeCookie", { cookieUrl, cookieName }); }
            catch (e) { log.error("Session", "removeCookie", e); }
          }}>
            removeCookie()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Session", "resolveProxy", await window.Electron.session.resolveProxy(cookieUrl)); }
            catch (e) { log.error("Session", "resolveProxy", e); }
          }}>
            resolveProxy()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.session.setProxy(proxyRules ? { proxyRules } : {}); log.info("Session", "setProxy", proxyRules || "reset"); }
            catch (e) { log.error("Session", "setProxy", e); }
          }}>
            setProxy/reset()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { await window.Electron.session.closeAllConnections(); log.info("Session", "closeAllConnections", "done"); }
            catch (e) { log.error("Session", "closeAllConnections", e); }
          }}>
            closeAllConnections()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Downloads / Print</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Label label="Download URL"><Input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} /></Label>
          <Label label="PDF path (optional)"><Input value={pdfPath} onChange={(e) => setPdfPath(e.target.value)} placeholder="/absolute/path/page.pdf" /></Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try {
              const started = await window.Electron.downloads.start({ url: downloadUrl });
              setActiveDownloadId(started.id);
              log.info("Downloads", "start", started);
            }
            catch (e) { log.error("Downloads", "start", e); }
          }}>
            downloads.start()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Downloads", "active", await window.Electron.downloads.getActive()); }
            catch (e) { log.error("Downloads", "active", e); }
          }}>
            getActive()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.downloads.pause(activeDownloadId); log.info("Downloads", "pause", activeDownloadId); }
            catch (e) { log.error("Downloads", "pause", e); }
          }} disabled={!activeDownloadId}>
            pause active
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.downloads.resume(activeDownloadId); log.info("Downloads", "resume", activeDownloadId); }
            catch (e) { log.error("Downloads", "resume", e); }
          }} disabled={!activeDownloadId}>
            resume active
          </Button>
          <Button type="red" onClick={async () => {
            try { await window.Electron.downloads.cancel(activeDownloadId); log.info("Downloads", "cancel", activeDownloadId); }
            catch (e) { log.error("Downloads", "cancel", e); }
          }} disabled={!activeDownloadId}>
            cancel active
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Print", "printers", await window.Electron.print.getPrinters()); }
            catch (e) { log.error("Print", "printers", e); }
          }}>
            getPrinters()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { log.info("Print", "print", await window.Electron.print.print({ silent: false })); }
            catch (e) { log.error("Print", "print", e); }
          }}>
            print()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { log.info("Print", "printToPDF", await window.Electron.print.printToPDF({ path: pdfPath || undefined })); }
            catch (e) { log.error("Print", "printToPDF", e); }
          }}>
            printToPDF()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Desktop capture / Auto launch / Theme</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { log.info("DesktopCapture", "sources", await window.Electron.desktopCapture.getSources({ types: ["screen", "window"] })); }
            catch (e) { log.error("DesktopCapture", "sources", e); }
          }}>
            getSources()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("AutoLaunch", "settings", await window.Electron.autoLaunch.getSettings()); }
            catch (e) { log.error("AutoLaunch", "settings", e); }
          }}>
            autoLaunch settings
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("AutoLaunch", "isEnabled", await window.Electron.autoLaunch.isEnabled()); }
            catch (e) { log.error("AutoLaunch", "isEnabled", e); }
          }}>
            autoLaunch isEnabled()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { log.info("AutoLaunch", "set true", await window.Electron.autoLaunch.setEnabled(true)); }
            catch (e) { log.error("AutoLaunch", "set true", e); }
          }}>
            autoLaunch ON
          </Button>
          <Button type="yellow" onClick={async () => {
            try { log.info("AutoLaunch", "set false", await window.Electron.autoLaunch.setEnabled(false)); }
            catch (e) { log.error("AutoLaunch", "set false", e); }
          }}>
            autoLaunch OFF
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("NativeTheme", "get", await window.Electron.nativeTheme.get()); }
            catch (e) { log.error("NativeTheme", "get", e); }
          }}>
            theme get()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { log.info("NativeTheme", "dark", await window.Electron.nativeTheme.setThemeSource("dark")); }
            catch (e) { log.error("NativeTheme", "dark", e); }
          }}>
            theme dark
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("NativeTheme", "system", await window.Electron.nativeTheme.setThemeSource("system")); }
            catch (e) { log.error("NativeTheme", "system", e); }
          }}>
            theme system
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Managed windows</p>
        <Label label="Window URL">
          <Input value={windowUrl} onChange={(e) => setWindowUrl(e.target.value)} />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try {
              const created = await window.Electron.windows.create({ url: windowUrl, width: 900, height: 700 });
              setLastWindowId(created.id);
              log.info("Windows", "create", created);
            }
            catch (e) { log.error("Windows", "create", e); }
          }}>
            create()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Windows", "list", await window.Electron.windows.list()); }
            catch (e) { log.error("Windows", "list", e); }
          }}>
            list()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { if (lastWindowId != null) await window.Electron.windows.focus(lastWindowId); log.info("Windows", "focus", lastWindowId); }
            catch (e) { log.error("Windows", "focus", e); }
          }} disabled={lastWindowId == null}>
            focus last
          </Button>
          <Button type="neutral" onClick={async () => {
            try { if (lastWindowId != null) await window.Electron.windows.hide(lastWindowId); log.info("Windows", "hide", lastWindowId); }
            catch (e) { log.error("Windows", "hide", e); }
          }} disabled={lastWindowId == null}>
            hide last
          </Button>
          <Button type="neutral" onClick={async () => {
            try { if (lastWindowId != null) await window.Electron.windows.show(lastWindowId); log.info("Windows", "show", lastWindowId); }
            catch (e) { log.error("Windows", "show", e); }
          }} disabled={lastWindowId == null}>
            show last
          </Button>
          <Button type="yellow" onClick={async () => {
            try { if (lastWindowId != null) await window.Electron.windows.setBounds(lastWindowId, { x: 80, y: 80, width: 720, height: 520 }); log.info("Windows", "setBounds", lastWindowId); }
            catch (e) { log.error("Windows", "setBounds", e); }
          }} disabled={lastWindowId == null}>
            setBounds last
          </Button>
          <Button type="red" onClick={async () => {
            try { if (lastWindowId != null) await window.Electron.windows.close(lastWindowId); log.info("Windows", "close", lastWindowId); setLastWindowId(null); }
            catch (e) { log.error("Windows", "close", e); }
          }} disabled={lastWindowId == null}>
            close last
          </Button>
          <Button type="neutral" onClick={async () => {
            try { await window.Electron.windows.openExternal(windowUrl); log.info("Windows", "openExternal", windowUrl); }
            catch (e) { log.error("Windows", "openExternal", e); }
          }}>
            openExternal()
          </Button>
        </div>
      </section>
    </div>
  );
};
