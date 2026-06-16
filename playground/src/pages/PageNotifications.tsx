import React, { useState } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

let nextId = 1;

export const PageNotifications: React.FC = () => {
  const log = useLogger();

  const [title, setTitle]   = useState("Test oznámení");
  const [body, setBody]     = useState("Zpráva z capacitor-electron");
  const [delayMs, setDelayMs] = useState("3000");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Oprávnění</p>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              const result = await LocalNotifications.checkPermissions();
              log.info("Notifications", "checkPermissions", result);
            } catch (e) { log.error("Notifications", "checkPermissions", e); }
          }}>
            checkPermissions()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const result = await LocalNotifications.requestPermissions();
              log.info("Notifications", "requestPermissions", result);
            } catch (e) { log.error("Notifications", "requestPermissions", e); }
          }}>
            requestPermissions()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const result = await LocalNotifications.areEnabled();
              log.info("Notifications", "areEnabled", result);
            } catch (e) { log.error("Notifications", "areEnabled", e); }
          }}>
            areEnabled()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">schedule() — okamžitě</p>
        <div className="flex flex-wrap gap-2">
          <Label label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Label>
          <Label label="Body">
            <Input value={body} onChange={(e) => setBody(e.target.value)} />
          </Label>
        </div>
        <Button type="primary" onClick={async () => {
          const id = nextId++;
          try {
            await LocalNotifications.schedule({
              notifications: [{ id, title, body }],
            });
            log.info("Notifications", "schedule(immediate)", { id, title });
          } catch (e) { log.error("Notifications", "schedule", e); }
        }}>
          schedule() — ihned
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">schedule() — odloženo</p>
        <Label label="Zpoždění (ms)">
          <Input
            value={delayMs}
            onChange={(e) => setDelayMs(e.target.value)}
            placeholder="3000"
          />
        </Label>
        <Button type="neutral" onClick={async () => {
          const id = nextId++;
          const at = new Date(Date.now() + Number(delayMs));
          try {
            await LocalNotifications.schedule({
              notifications: [{ id, title, body, schedule: { at } }],
            });
            log.info("Notifications", `schedule(at +${delayMs}ms)`, { id, at: at.toISOString() });
          } catch (e) { log.error("Notifications", "schedule(at)", e); }
        }}>
          schedule() — za {delayMs} ms
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">schedule() — opakující se (každých 5s, 3×)</p>
        <Button type="neutral" onClick={async () => {
          const id = nextId++;
          try {
            await LocalNotifications.schedule({
              notifications: [{
                id,
                title: "Opakované oznámení",
                body: `ID ${id} — každých 5s, max 3×`,
                schedule: { every: "second", count: 5, repeats: true },
              }],
            });
            log.info("Notifications", "schedule(every 5s×3)", { id });
          } catch (e) { log.error("Notifications", "schedule(repeating)", e); }
        }}>
          schedule() — každých 5s, 3×
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Správa fronty</p>
        <div className="flex flex-wrap gap-2">
          <Button type="neutral" onClick={async () => {
            try {
              const result = await LocalNotifications.getPending();
              log.info("Notifications", "getPending", result);
            } catch (e) { log.error("Notifications", "getPending", e); }
          }}>
            getPending()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const result = await LocalNotifications.getDeliveredNotifications();
              log.info("Notifications", "getDeliveredNotifications", result);
            } catch (e) { log.error("Notifications", "getDeliveredNotifications", e); }
          }}>
            getDelivered()
          </Button>

          <Button type="red" onClick={async () => {
            try {
              await LocalNotifications.removeAllDeliveredNotifications();
              log.info("Notifications", "removeAllDelivered", "done");
            } catch (e) { log.error("Notifications", "removeAllDelivered", e); }
          }}>
            removeAllDelivered()
          </Button>
        </div>
      </section>
    </div>
  );
};
