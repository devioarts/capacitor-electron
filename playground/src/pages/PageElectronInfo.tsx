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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="primary" onClick={async () => {
          try { log.info("Electron", "getAppVersion", await window.Electron.getAppVersion()); }
          catch (e) { log.error("Electron", "getAppVersion", e); }
        }}>
          getAppVersion()
        </Button>

        <Button type={listening ? "green" : "neutral"} onClick={() => setListening((v) => !v)}>
          {listening ? "Process errors ON" : "Process errors OFF"}
        </Button>
      </div>
      {listening && (
        <p className="text-xs text-slate-500">
          Poslouchám uncaughtException / unhandledRejection z main procesu.
        </p>
      )}
    </div>
  );
};
