// Playground page for inspecting the Electron bridge and main-process error events.
import React, { useEffect, useState } from "react";
import type { ElectronBridge } from "@devioarts/capacitor-electron";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

type RuntimeElectronWindow = {
  Electron?: ElectronBridge;
};

export const PageElectronInfo: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [listening, setListening] = useState(false);
  const electron = (window as unknown as RuntimeElectronWindow).Electron;

  useEffect(() => {
    if (!listening || !electron) return;
    return electron.onElectronError((data) => info("ElectronError", data.type, data));
  }, [listening, info, electron]);

  const hasBridge = typeof electron !== "undefined";
  const hasUpdater = typeof electron?.updater !== "undefined";
  const hasDeepLink = typeof electron?.onDeepLink === "function";

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Bridge capabilities</p>
        <p className="text-xs text-slate-500">
          Optional bridges are activated by config; their presence confirms the feature is wired up.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "updater bridge", active: hasUpdater, note: "app.autoUpdater.enabled" },
            { label: "onDeepLink bridge", active: hasDeepLink, note: "app.deepLinkingScheme" },
            { label: "dialogs", active: hasBridge && typeof electron?.dialogs !== "undefined", note: "always available in Electron" },
            { label: "secureStorage", active: hasBridge && typeof electron?.secureStorage !== "undefined", note: "always available in Electron" },
            { label: "session", active: hasBridge && typeof electron?.session !== "undefined", note: "always available in Electron" },
            { label: "downloads", active: hasBridge && typeof electron?.downloads !== "undefined", note: "always available in Electron" },
            { label: "print", active: hasBridge && typeof electron?.print !== "undefined", note: "always available in Electron" },
            { label: "desktopCapture", active: hasBridge && typeof electron?.desktopCapture !== "undefined", note: "always available in Electron" },
            { label: "autoLaunch", active: hasBridge && typeof electron?.autoLaunch !== "undefined", note: "always available in Electron" },
            { label: "nativeTheme", active: hasBridge && typeof electron?.nativeTheme !== "undefined", note: "always available in Electron" },
            { label: "windows", active: hasBridge && typeof electron?.windows !== "undefined", note: "always available in Electron" },
            { label: "protocols", active: hasBridge && typeof electron?.protocols !== "undefined", note: "always available in Electron" },
          ].map(({ label, active, note }) => (
            <div key={label} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="font-mono font-medium text-slate-800">{label}</span>
              </div>
              <p className="text-slate-400 mt-0.5 pl-4">{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">App info</p>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" disabled={!electron} onClick={async () => {
            if (!electron) return;
            try { log.info("Electron", "getAppVersion", await electron.getAppVersion()); }
            catch (e) { log.error("Electron", "getAppVersion", e); }
          }}>
            getAppVersion()
          </Button>
          <Button type="neutral" disabled={!electron} onClick={() => {
            if (!electron) return;
            const keys = Object.keys(electron).sort();
            log.info("Electron", "bridge keys", keys);
          }}>
            inspect bridge keys
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Process error listener</p>
        <p className="text-xs text-slate-500">
          Listens for <code>uncaughtException</code> / <code>unhandledRejection</code> from the main process.
        </p>
        <Button type={listening ? "green" : "neutral"} disabled={!electron} onClick={() => setListening((v) => !v)}>
          {listening ? "Process errors ON" : "Process errors OFF"}
        </Button>
      </section>
    </div>
  );
};
