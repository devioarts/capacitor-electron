import React from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

const plugins = [
  "App",
  "Dialog",
  "Filesystem",
  "Preferences",
  "Toast",
  "ActionSheet",
  "Browser",
  "AppLauncher",
  "InAppBrowser",
  "LocalNotifications",
  "Clipboard",
  "Device",
  "Network",
  "FileTransfer",
  "FileViewer",
  "PrivacyScreen",
];

export const PageCapacitorRuntime: React.FC = () => {
  const log = useLogger();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="primary" onClick={() => log.info("Capacitor", "getPlatform", Capacitor.getPlatform())}>
          getPlatform()
        </Button>
        <Button type="primary" onClick={() => log.info("Capacitor", "isNativePlatform", Capacitor.isNativePlatform())}>
          isNativePlatform()
        </Button>
        <Button type="neutral" onClick={() => {
          for (const name of plugins) {
            log.info("Capacitor", `isPluginAvailable(${name})`, Capacitor.isPluginAvailable(name));
          }
        }}>
          check plugin availability
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {plugins.map((name) => (
          <div key={name} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium text-slate-700">{name}</span>
            <span className="ml-2 font-mono text-xs text-slate-500">
              {String(Capacitor.isPluginAvailable(name))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
