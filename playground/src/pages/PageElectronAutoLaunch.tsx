import React from "react";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronAutoLaunch: React.FC = () => {
  const log = useLogger();

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="neutral" onClick={async () => {
        try { log.info("AutoLaunch", "getSettings", await window.Electron.autoLaunch.getSettings()); }
        catch (e) { log.error("AutoLaunch", "getSettings", e); }
      }}>
        getSettings()
      </Button>
      <Button type="neutral" onClick={async () => {
        try { log.info("AutoLaunch", "isEnabled", await window.Electron.autoLaunch.isEnabled()); }
        catch (e) { log.error("AutoLaunch", "isEnabled", e); }
      }}>
        isEnabled()
      </Button>
      <Button type="yellow" onClick={async () => {
        try { log.info("AutoLaunch", "setEnabled(true)", await window.Electron.autoLaunch.setEnabled(true)); }
        catch (e) { log.error("AutoLaunch", "setEnabled(true)", e); }
      }}>
        enable
      </Button>
      <Button type="yellow" onClick={async () => {
        try { log.info("AutoLaunch", "setEnabled(false)", await window.Electron.autoLaunch.setEnabled(false)); }
        catch (e) { log.error("AutoLaunch", "setEnabled(false)", e); }
      }}>
        disable
      </Button>
    </div>
  );
};
