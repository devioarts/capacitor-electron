import React, { useEffect } from "react";
import type { UpdaterEventName } from "@devioarts/capacitor-electron";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

const updaterEvents: UpdaterEventName[] = [
  "checking-for-update",
  "update-available",
  "update-not-available",
  "download-progress",
  "update-downloaded",
  "error",
];

export const PageElectronUpdater: React.FC = () => {
  const log = useLogger();
  const { info } = log;

  useEffect(() => {
    const offUpdater = window.Electron.updater
      ? updaterEvents.map((event) => window.Electron.updater!.on(event, (data) => info("Updater", event, data)))
      : [];
    return () => { offUpdater.forEach((off) => off()); };
  }, [info]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Updater calls are no-ops in development unless <code>app.autoUpdater.enabled</code> is active in a packaged build.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="neutral" onClick={async () => {
          try { await window.Electron.updater?.checkForUpdate(); log.info("Updater", "checkForUpdate", "called"); }
          catch (e) { log.error("Updater", "checkForUpdate", e); }
        }}>
          checkForUpdate()
        </Button>
        <Button type="neutral" onClick={async () => {
          try { await window.Electron.updater?.downloadUpdate(); log.info("Updater", "downloadUpdate", "called"); }
          catch (e) { log.error("Updater", "downloadUpdate", e); }
        }}>
          downloadUpdate()
        </Button>
        <Button type="red" onClick={async () => {
          try { window.Electron.updater?.quitAndInstall(); log.info("Updater", "quitAndInstall", "called"); }
          catch (e) { log.error("Updater", "quitAndInstall", e); }
        }}>
          quitAndInstall()
        </Button>
      </div>
    </div>
  );
};
