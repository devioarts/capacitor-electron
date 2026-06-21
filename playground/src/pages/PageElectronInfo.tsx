// Playground page for inspecting the Electron bridge and main-process error events.
import React, { useEffect, useState } from "react";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronInfo: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;
    return window.Electron.onElectronError((data) => info("ElectronError", data.type, data));
  }, [listening, info]);

  const hasUpdater = typeof window.Electron.updater !== "undefined";
  const hasDeepLink = typeof window.Electron.onDeepLink === "function";

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
            { label: "dialogs", active: true, note: "always available" },
            { label: "secureStorage", active: true, note: "always available" },
            { label: "session", active: true, note: "always available" },
            { label: "downloads", active: true, note: "always available" },
            { label: "print", active: true, note: "always available" },
            { label: "desktopCapture", active: true, note: "always available" },
            { label: "autoLaunch", active: true, note: "always available" },
            { label: "nativeTheme", active: true, note: "always available" },
            { label: "windows", active: true, note: "always available" },
            { label: "protocols", active: true, note: "always available" },
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
          <Button type="primary" onClick={async () => {
            try { log.info("Electron", "getAppVersion", await window.Electron.getAppVersion()); }
            catch (e) { log.error("Electron", "getAppVersion", e); }
          }}>
            getAppVersion()
          </Button>
          <Button type="neutral" onClick={() => {
            const keys = Object.keys(window.Electron).sort();
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
        <Button type={listening ? "green" : "neutral"} onClick={() => setListening((v) => !v)}>
          {listening ? "Process errors ON" : "Process errors OFF"}
        </Button>
      </section>
    </div>
  );
};
