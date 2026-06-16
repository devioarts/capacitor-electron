import React, { useEffect, useState } from "react";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageScreen: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;
    const unsub = window.Electron.onScreenEvent((payload) => {
      info("Screen", payload.type, payload.data);
    });
    return unsub;
  }, [listening, info]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Displeje</p>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              const displays = await window.Electron.getAllDisplays();
              log.info("Screen", "getAllDisplays", displays);
            } catch (e) { log.error("Screen", "getAllDisplays", e); }
          }}>
            getAllDisplays()
          </Button>

          <Button type="primary" onClick={async () => {
            try {
              const d = await window.Electron.getPrimaryDisplay();
              log.info("Screen", "getPrimaryDisplay", d);
            } catch (e) { log.error("Screen", "getPrimaryDisplay", e); }
          }}>
            getPrimaryDisplay()
          </Button>

          <Button type="primary" onClick={async () => {
            try {
              const d = await window.Electron.getCursorDisplay();
              log.info("Screen", "getCursorDisplay", d);
            } catch (e) { log.error("Screen", "getCursorDisplay", e); }
          }}>
            getCursorDisplay()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const pt = await window.Electron.getCursorScreenPoint();
              log.info("Screen", "getCursorScreenPoint", pt);
            } catch (e) { log.error("Screen", "getCursorScreenPoint", e); }
          }}>
            getCursorScreenPoint()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Události displeje</p>
        <p className="text-xs text-slate-500">
          Připoj nebo odpoj monitor, změň rozlišení / scaling — zobrazí se{" "}
          <code>display-added</code>, <code>display-removed</code>,{" "}
          <code>display-metrics-changed</code>.
        </p>
        <Button
          type={listening ? "green" : "neutral"}
          onClick={() => setListening((v) => !v)}
        >
          {listening ? "Posluchač: ON ✓" : "Posluchač: OFF"}
        </Button>
      </section>
    </div>
  );
};
