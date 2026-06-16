import React, { useEffect, useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PagePowerMonitor: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [listening, setListening] = useState(false);
  const [idleThreshold, setIdleThreshold] = useState("30");

  useEffect(() => {
    if (!listening) return;
    const unsub = window.Electron.onPowerMonitorEvent(({ type }) => {
      info("PowerMonitor", "event", { type });
    });
    return unsub;
  }, [listening, info]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Události systémového napájení</p>
        <p className="text-xs text-slate-500">
          Zapni posluchač, pak zkus uspat/probudit počítač nebo zamknout obrazovku.
          Události: <code>suspend</code>, <code>resume</code>, <code>lock-screen</code>,{" "}
          <code>unlock-screen</code>, <code>on-battery</code>, <code>on-ac</code>,{" "}
          <code>shutdown</code>.
        </p>
        <Button
          type={listening ? "green" : "neutral"}
          onClick={() => setListening((v) => !v)}
        >
          {listening ? "Posluchač: ON ✓" : "Posluchač: OFF"}
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">getSystemIdleState()</p>
        <p className="text-xs text-slate-500">
          Vrátí stav uživatele: <code>active</code>, <code>idle</code>, <code>locked</code>{" "}
          nebo <code>unknown</code>. Threshold určuje kolik sekund nečinnosti = idle.
        </p>
        <Label label="Idle threshold (s)">
          <Input
            type="number"
            min="1"
            value={idleThreshold}
            onChange={(e) => setIdleThreshold(e.target.value)}
          />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              const seconds = parseInt(idleThreshold, 10) || 30;
              const state = await window.Electron.getPowerMonitorIdleState(seconds);
              log.info("PowerMonitor", `getSystemIdleState(${seconds})`, state);
            } catch (e) { log.error("PowerMonitor", "getSystemIdleState", e); }
          }}>
            getSystemIdleState()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">getSystemIdleTime()</p>
        <p className="text-xs text-slate-500">
          Vrátí počet sekund od posledního vstupu uživatele (myš / klávesnice).
        </p>
        <Button type="primary" onClick={async () => {
          try {
            const seconds = await window.Electron.getPowerMonitorIdleTime();
            log.info("PowerMonitor", "getSystemIdleTime", `${seconds}s`);
          } catch (e) { log.error("PowerMonitor", "getSystemIdleTime", e); }
        }}>
          getSystemIdleTime()
        </Button>
      </section>
    </div>
  );
};
