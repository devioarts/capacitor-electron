// Playground landing page with quick runtime checks and project context.
import React from "react";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";
import { Capacitor } from "@capacitor/core";

export const PageHome: React.FC = () => {
  const log = useLogger();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="primary" onClick={() => {
          log.info("Capacitor", "getPlatform", Capacitor.getPlatform());
        }}>
          getPlatform()
        </Button>

        <Button type="primary" onClick={() => {
          log.info("Capacitor", "isNativePlatform", Capacitor.isNativePlatform());
        }}>
          isNativePlatform()
        </Button>

        <Button type="primary" onClick={async () => {
          try {
            const version = await window.Electron.getAppVersion();
            log.info("Electron", "getAppVersion", version);
          } catch (e) {
            log.error("Electron", "getAppVersion", e);
          }
        }}>
          Electron.getAppVersion()
        </Button>

        <Button type="neutral" onClick={() => {
          const plugins = ["App", "Dialog", "Filesystem", "Preferences", "Toast", "ActionSheet", "Browser", "AppLauncher", "LocalNotifications"];
          for (const name of plugins) {
            log.info("Capacitor", `isPluginAvailable(${name})`, Capacitor.isPluginAvailable(name));
          }
        }}>
          checkAllPlugins()
        </Button>
      </div>
    </div>
  );
};
