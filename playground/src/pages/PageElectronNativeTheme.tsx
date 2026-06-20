import React, { useEffect } from "react";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronNativeTheme: React.FC = () => {
  const log = useLogger();
  const { info } = log;

  useEffect(() => {
    return window.Electron.nativeTheme.onUpdated((data) => info("NativeTheme", "updated", data));
  }, [info]);

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="neutral" onClick={async () => {
        try { log.info("NativeTheme", "get", await window.Electron.nativeTheme.get()); }
        catch (e) { log.error("NativeTheme", "get", e); }
      }}>
        get()
      </Button>
      <Button type="yellow" onClick={async () => {
        try { log.info("NativeTheme", "light", await window.Electron.nativeTheme.setThemeSource("light")); }
        catch (e) { log.error("NativeTheme", "light", e); }
      }}>
        light
      </Button>
      <Button type="yellow" onClick={async () => {
        try { log.info("NativeTheme", "dark", await window.Electron.nativeTheme.setThemeSource("dark")); }
        catch (e) { log.error("NativeTheme", "dark", e); }
      }}>
        dark
      </Button>
      <Button type="neutral" onClick={async () => {
        try { log.info("NativeTheme", "system", await window.Electron.nativeTheme.setThemeSource("system")); }
        catch (e) { log.error("NativeTheme", "system", e); }
      }}>
        system
      </Button>
    </div>
  );
};
