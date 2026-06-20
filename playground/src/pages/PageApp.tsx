import React, { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageApp: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;

    const handles: Array<Promise<{ remove: () => Promise<void> }>> = [
      App.addListener("appStateChange", (state) => info("App", "appStateChange", state)),
      App.addListener("resume",         ()        => info("App", "resume")),
      App.addListener("pause",          ()        => info("App", "pause")),
      App.addListener("appUrlOpen",     (data)    => info("App", "appUrlOpen", data)),
      App.addListener("backButton",     ()        => info("App", "backButton (no-op on desktop)")),
    ];

    return () => {
      handles.forEach((h) => h.then((r) => r.remove()));
    };
  }, [listening, info]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="primary" onClick={async () => {
          try {
            const appInfo = await App.getInfo();
            log.info("App", "getInfo", appInfo);
          } catch (e) { log.error("App", "getInfo", e); }
        }}>
          getInfo()
        </Button>

        <Button type="primary" onClick={async () => {
          try {
            const state = await App.getState();
            log.info("App", "getState", state);
          } catch (e) { log.error("App", "getState", e); }
        }}>
          getState()
        </Button>

        <Button type="primary" onClick={async () => {
          try {
            const url = await App.getLaunchUrl();
            log.info("App", "getLaunchUrl", url ?? "(none)");
          } catch (e) { log.error("App", "getLaunchUrl", e); }
        }}>
          getLaunchUrl()
        </Button>

        <Button type="primary" onClick={async () => {
          try {
            const lang = await App.getAppLanguage();
            log.info("App", "getAppLanguage", lang);
          } catch (e) { log.error("App", "getAppLanguage", e); }
        }}>
          getAppLanguage()
        </Button>

        <Button type="yellow" onClick={async () => {
          try {
            await App.minimizeApp();
            log.info("App", "minimizeApp", "done");
          } catch (e) { log.error("App", "minimizeApp", e); }
        }}>
          minimizeApp()
        </Button>

        <Button
          type={listening ? "green" : "neutral"}
          onClick={() => setListening((v) => !v)}
        >
          {listening ? "Events ON" : "Events OFF"}
        </Button>

        <Button type="red" onClick={async () => {
          try {
            await App.exitApp();
          } catch (e) { log.error("App", "exitApp", e); }
        }}>
          exitApp()
        </Button>
      </div>

      {listening && (
        <p className="text-xs text-slate-500">
          Listening for <code>appStateChange</code>, <code>resume</code>, <code>pause</code>,{" "}
          <code>appUrlOpen</code>, <code>backButton</code> (desktop no-op).
          Switch windows or minimize the app to trigger lifecycle events.
        </p>
      )}
    </div>
  );
};
