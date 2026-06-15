import React, { useEffect, useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/Logger.tsx";

export const PageShortcuts: React.FC = () => {
  const log = useLogger();
  const [accelerator, setAccelerator] = useState("CmdOrCtrl+Shift+T");
  const [eventName, setEventName]     = useState("test-shortcut");
  const [unregAccel, setUnregAccel]   = useState("CmdOrCtrl+Shift+T");
  const [listening, setListening]     = useState(false);

  useEffect(() => {
    if (!listening) return;
    const unsub = window.Electron.onShortcut(({ event }) => {
      log.info("Shortcut", "triggered", { event });
    });
    return unsub;
  }, [listening]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Poslouchání zkratek</p>
        <p className="text-xs text-slate-500">
          Nejdříve zapni posluchač, pak zaregistruj zkratku a stiskni ji.
        </p>
        <Button
          type={listening ? "green" : "neutral"}
          onClick={() => setListening((v) => !v)}
        >
          {listening ? "Posluchač: ON ✓" : "Posluchač: OFF"}
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">registerShortcut()</p>
        <p className="text-xs text-slate-500">
          Zkratky akcelerátory: <code>CmdOrCtrl</code>, <code>Alt</code>, <code>Shift</code>,
          <code>Super</code> + klávesa. Např. <code>CmdOrCtrl+Shift+K</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Label label="Accelerator">
            <Input
              value={accelerator}
              onChange={(e) => setAccelerator(e.target.value)}
              placeholder="CmdOrCtrl+Shift+T"
            />
          </Label>
          <Label label="Event name">
            <Input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="my-event"
            />
          </Label>
        </div>
        <Button type="primary" onClick={async () => {
          try {
            const ok = await window.Electron.registerShortcut(accelerator, eventName);
            log.info("Shortcuts", "registerShortcut", { accelerator, eventName, registered: ok });
          } catch (e) { log.error("Shortcuts", "registerShortcut", e); }
        }}>
          registerShortcut()
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">unregisterShortcut()</p>
        <Label label="Accelerator">
          <Input
            value={unregAccel}
            onChange={(e) => setUnregAccel(e.target.value)}
            placeholder="CmdOrCtrl+Shift+T"
          />
        </Label>
        <Button type="red" onClick={async () => {
          try {
            await window.Electron.unregisterShortcut(unregAccel);
            log.info("Shortcuts", "unregisterShortcut", { accelerator: unregAccel });
          } catch (e) { log.error("Shortcuts", "unregisterShortcut", e); }
        }}>
          unregisterShortcut()
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Rychlé testy</p>
        <div className="flex flex-wrap gap-2">
          <Button type="neutral" onClick={async () => {
            const ok = await window.Electron.registerShortcut("CmdOrCtrl+Shift+1", "test-1");
            log.info("Shortcuts", "quick register CmdOrCtrl+Shift+1", { ok });
          }}>
            Register CmdOrCtrl+Shift+1
          </Button>

          <Button type="neutral" onClick={async () => {
            const ok = await window.Electron.registerShortcut("CmdOrCtrl+Shift+2", "test-2");
            log.info("Shortcuts", "quick register CmdOrCtrl+Shift+2", { ok });
          }}>
            Register CmdOrCtrl+Shift+2
          </Button>

          <Button type="red" onClick={async () => {
            await window.Electron.unregisterShortcut("CmdOrCtrl+Shift+1");
            await window.Electron.unregisterShortcut("CmdOrCtrl+Shift+2");
            log.info("Shortcuts", "unregistered", "CmdOrCtrl+Shift+1, CmdOrCtrl+Shift+2");
          }}>
            Unregister oba
          </Button>
        </div>
      </section>
    </div>
  );
};
