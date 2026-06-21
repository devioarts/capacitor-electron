// Playground page for exercising Electron power monitor and power save blocker APIs.
import React, { useEffect, useState } from "react";
import type { PowerSaveBlockerType } from "@devioarts/capacitor-electron";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PagePowerMonitor: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [listening, setListening] = useState(false);
  const [idleThreshold, setIdleThreshold] = useState("30");
  const [blockerType, setBlockerType] = useState<PowerSaveBlockerType>("prevent-display-sleep");
  const [blockerId, setBlockerId] = useState<number | null>(null);

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
        <p className="text-sm font-semibold text-slate-700">System power events</p>
        <p className="text-xs text-slate-500">
          Enable the listener, then sleep/wake the machine or lock/unlock the screen.
          Events: <code>suspend</code>, <code>resume</code>, <code>lock-screen</code>,{" "}
          <code>unlock-screen</code>, <code>on-battery</code>, <code>on-ac</code>,{" "}
          <code>shutdown</code>.
        </p>
        <Button
          type={listening ? "green" : "neutral"}
          onClick={() => setListening((v) => !v)}
        >
          {listening ? "Listener ON" : "Listener OFF"}
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">getSystemIdleState()</p>
        <p className="text-xs text-slate-500">
          Returns the user state: <code>active</code>, <code>idle</code>, <code>locked</code>{" "}
          or <code>unknown</code>. The threshold controls how many inactive seconds count as idle.
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
          Returns the number of seconds since the last user input (mouse or keyboard).
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

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">powerSaveBlocker</p>
        <p className="text-xs text-slate-500">
          <code>prevent-app-suspension</code> keeps the app active.{" "}
          <code>prevent-display-sleep</code> also prevents the display from sleeping.
        </p>
        <Label label="Blocker type">
          <select
            value={blockerType}
            onChange={(e) => setBlockerType(e.target.value as PowerSaveBlockerType)}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-full"
          >
            <option value="prevent-display-sleep">prevent-display-sleep</option>
            <option value="prevent-app-suspension">prevent-app-suspension</option>
          </select>
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button type="green" onClick={async () => {
            try {
              const id = await window.Electron.startPowerSaveBlocker(blockerType);
              setBlockerId(id);
              log.info("PowerSaveBlocker", `start(${blockerType})`, { id });
            } catch (e) { log.error("PowerSaveBlocker", "start", e); }
          }}>
            Start
          </Button>
          <Button type="primary" disabled={blockerId === null} onClick={async () => {
            if (blockerId === null) return;
            try {
              const started = await window.Electron.isPowerSaveBlockerStarted(blockerId);
              log.info("PowerSaveBlocker", `isStarted(${blockerId})`, started);
            } catch (e) { log.error("PowerSaveBlocker", "isStarted", e); }
          }}>
            isStarted()
          </Button>
          <Button type="red" disabled={blockerId === null} onClick={async () => {
            if (blockerId === null) return;
            try {
              const id = blockerId;
              const stopped = await window.Electron.stopPowerSaveBlocker(id);
              if (stopped) setBlockerId(null);
              log.info("PowerSaveBlocker", `stop(${id})`, stopped);
            } catch (e) { log.error("PowerSaveBlocker", "stop", e); }
          }}>
            Stop
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Active blocker id: <code>{blockerId ?? "none"}</code>
        </p>
      </section>
    </div>
  );
};
