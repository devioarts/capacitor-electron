// Playground page for exercising Capacitor App Launcher URL policy on Electron.
import React, { useState } from "react";
import { AppLauncher } from "@capacitor/app-launcher";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { PlatformSupport } from "../components/PlatformSupport.tsx";
import { useLogger } from "../components/logger-context";

export const PageAppLauncher: React.FC = () => {
  const log = useLogger();
  const [url, setUrl] = useState("https://capacitorjs.com");

  return (
    <div className="space-y-4">
      <PlatformSupport
        title="Electron behavior"
        platforms={["Electron", "iOS", "Android"]}
        notes={
          <>
            Electron opens URLs through <code>shell.openExternal</code>.{" "}
            <code>canOpenUrl()</code> checks the local allowlist only; a true result means the URL
            is allowed, not that the operating system has a registered handler.
          </>
        }
      />
      <Label label="URL">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      </Label>
      <div className="flex flex-wrap gap-2">
        <Button type="neutral" onClick={async () => {
          try { log.info("AppLauncher", "canOpenUrl", await AppLauncher.canOpenUrl({ url })); }
          catch (e) { log.error("AppLauncher", "canOpenUrl", e); }
        }}>
          canOpenUrl()
        </Button>
        <Button type="primary" onClick={async () => {
          try { log.info("AppLauncher", "openUrl", await AppLauncher.openUrl({ url })); }
          catch (e) { log.error("AppLauncher", "openUrl", e); }
        }}>
          openUrl()
        </Button>
        <Button type="neutral" onClick={async () => {
          try { log.info("AppLauncher", "canOpenUrl(capelectron)", await AppLauncher.canOpenUrl({ url: "capelectron://test/from-playground" })); }
          catch (e) { log.error("AppLauncher", "canOpenUrl(capelectron)", e); }
        }}>
          canOpen capelectron
        </Button>
        <Button type="red" onClick={async () => {
          try { log.warn("AppLauncher", "openUrl(unsafe)", await AppLauncher.openUrl({ url: "javascript:alert(1)" })); }
          catch (e) { log.error("AppLauncher", "openUrl(unsafe)", e); }
        }}>
          unsafe javascript:
        </Button>
      </div>
    </div>
  );
};
