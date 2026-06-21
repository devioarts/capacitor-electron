// Playground page for exercising the optional electron-updater bridge.
import React, { useEffect } from "react";
import type { ElectronBridge, UpdaterEventName } from "@devioarts/capacitor-electron";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

type RuntimeElectronWindow = {
  Electron?: ElectronBridge;
};

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
  const updater = (window as unknown as RuntimeElectronWindow).Electron?.updater;

  useEffect(() => {
    const offUpdater = updater
      ? updaterEvents.map((event) => updater.on(event, (data) => info("Updater", event, data)))
      : [];
    return () => { offUpdater.forEach((off) => off()); };
  }, [info, updater]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Updater calls are no-ops in development unless <code>app.autoUpdater.enabled</code> is active in a packaged build.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="neutral" disabled={!updater} onClick={async () => {
          if (!updater) return;
          try { await updater.checkForUpdate(); log.info("Updater", "checkForUpdate", "called"); }
          catch (e) { log.error("Updater", "checkForUpdate", e); }
        }}>
          checkForUpdate()
        </Button>
        <Button type="neutral" disabled={!updater} onClick={async () => {
          if (!updater) return;
          try { await updater.downloadUpdate(); log.info("Updater", "downloadUpdate", "called"); }
          catch (e) { log.error("Updater", "downloadUpdate", e); }
        }}>
          downloadUpdate()
        </Button>
        <Button type="red" disabled={!updater} onClick={async () => {
          if (!updater) return;
          try { updater.quitAndInstall(); log.info("Updater", "quitAndInstall", "called"); }
          catch (e) { log.error("Updater", "quitAndInstall", e); }
        }}>
          quitAndInstall()
        </Button>
      </div>
    </div>
  );
};
