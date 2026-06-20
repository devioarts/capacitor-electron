import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronSession: React.FC = () => {
  const log = useLogger();
  const [url, setUrl] = useState("https://capacitorjs.com/");
  const [cookieName, setCookieName] = useState("cap-electron-test");
  const [cookieValue, setCookieValue] = useState("ok");
  const [proxyRules, setProxyRules] = useState("");
  const [userAgent, setUserAgent] = useState("");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">User agent / cache / proxy</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Label label="URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} /></Label>
          <Label label="User agent override"><Input value={userAgent} onChange={(e) => setUserAgent(e.target.value)} placeholder="empty keeps current" /></Label>
          <Label label="Proxy rules"><Input value={proxyRules} onChange={(e) => setProxyRules(e.target.value)} placeholder="http=127.0.0.1:8080" /></Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="neutral" onClick={async () => {
            try {
              const value = await window.Electron.session.getUserAgent();
              setUserAgent(value);
              log.info("Session", "getUserAgent", value);
            } catch (e) { log.error("Session", "getUserAgent", e); }
          }}>
            getUserAgent()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.session.setUserAgent(userAgent); log.info("Session", "setUserAgent", userAgent); }
            catch (e) { log.error("Session", "setUserAgent", e); }
          }}>
            setUserAgent()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Session", "resolveProxy", await window.Electron.session.resolveProxy(url)); }
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
            try { await window.Electron.session.closeAllConnections(); log.info("Session", "closeAllConnections", "done"); }
            catch (e) { log.error("Session", "closeAllConnections", e); }
          }}>
            closeAllConnections()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Cookies</p>
        <div className="grid gap-2 md:grid-cols-3">
          <Label label="Cookie URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} /></Label>
          <Label label="Cookie name"><Input value={cookieName} onChange={(e) => setCookieName(e.target.value)} /></Label>
          <Label label="Cookie value"><Input value={cookieValue} onChange={(e) => setCookieValue(e.target.value)} /></Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { await window.Electron.session.setCookie({ url, name: cookieName, value: cookieValue }); log.info("Session", "setCookie", { url, cookieName }); }
            catch (e) { log.error("Session", "setCookie", e); }
          }}>
            setCookie()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Session", "getCookies", await window.Electron.session.getCookies({ url })); }
            catch (e) { log.error("Session", "getCookies", e); }
          }}>
            getCookies()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.session.removeCookie({ url, name: cookieName }); log.info("Session", "removeCookie", { url, cookieName }); }
            catch (e) { log.error("Session", "removeCookie", e); }
          }}>
            removeCookie()
          </Button>
        </div>
      </section>
    </div>
  );
};
