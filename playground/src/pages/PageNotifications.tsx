// Playground page for exercising Capacitor Local Notifications scheduling and events.
import React, { useEffect, useState } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

const AndroidOnly: React.FC = () => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-green-100 text-green-700 ml-1">Android</span>
);

let nextId = 1;

export const PageNotifications: React.FC = () => {
  const log = useLogger();
  const { info } = log;

  const [title, setTitle]   = useState("Test notification");
  const [body, setBody]     = useState("Message from capacitor-electron");
  const [delayMs, setDelayMs] = useState("3000");
  const [notificationId, setNotificationId] = useState("");
  const [cancelId, setCancelId] = useState("");
  const [deliveredId, setDeliveredId] = useState("");
  const [actionTypeId, setActionTypeId] = useState("default");
  const [channelId, setChannelId] = useState("playground");
  const [silent, setSilent] = useState(false);
  const [extraJson, setExtraJson] = useState('{"source":"playground"}');
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;
    const handles = [
      LocalNotifications.addListener("localNotificationReceived", (notification) => {
        info("Notifications", "localNotificationReceived", notification);
      }),
      LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
        info("Notifications", "localNotificationActionPerformed", action);
      }),
    ];
    return () => { handles.forEach((handle) => void handle.then((h) => h.remove())); };
  }, [listening, info]);

  const nextNotificationId = () => {
    const parsed = Number(notificationId);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return nextId++;
  };

  const extra = () => {
    try {
      return extraJson ? JSON.parse(extraJson) : undefined;
    } catch {
      return extraJson;
    }
  };

  const notificationBase = (id: number) => ({
    id,
    title,
    body,
    silent,
    actionTypeId: actionTypeId || undefined,
    channelId: channelId || undefined,
    extra: extra(),
  });

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Permissions</p>
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
          <Button type="neutral" onClick={async () => {
            try {
              const result = await LocalNotifications.checkExactNotificationSetting();
              log.info("Notifications", "checkExactNotificationSetting", result);
            } catch (e) { log.error("Notifications", "checkExactNotificationSetting", e); }
          }}>
            checkExactNotificationSetting()<AndroidOnly />
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              const result = await LocalNotifications.changeExactNotificationSetting();
              log.info("Notifications", "changeExactNotificationSetting", result);
            } catch (e) { log.error("Notifications", "changeExactNotificationSetting", e); }
          }}>
            changeExactNotificationSetting()<AndroidOnly />
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Notification payload</p>
        <div className="grid gap-2 md:grid-cols-3">
          <Label label="ID override">
            <Input value={notificationId} onChange={(e) => setNotificationId(e.target.value)} placeholder="auto" />
          </Label>
          <Label label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Label>
          <Label label="Body">
            <Input value={body} onChange={(e) => setBody(e.target.value)} />
          </Label>
          <Label label="Action type ID">
            <Input value={actionTypeId} onChange={(e) => setActionTypeId(e.target.value)} />
          </Label>
          <Label label="Channel ID">
            <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} />
          </Label>
          <Label label="Extra JSON">
            <Input value={extraJson} onChange={(e) => setExtraJson(e.target.value)} />
          </Label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={silent} onChange={(e) => setSilent(e.target.checked)} />
          silent notification
        </label>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">schedule() - immediate</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type={listening ? "green" : "neutral"}
            onClick={() => setListening((v) => !v)}
          >
            {listening ? "Events ON" : "Events OFF"}
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await LocalNotifications.removeAllListeners(); log.info("Notifications", "removeAllListeners", "done"); }
            catch (e) { log.error("Notifications", "removeAllListeners", e); }
          }}>
            removeAllListeners()
          </Button>
        </div>
        <Button type="primary" onClick={async () => {
          const id = nextNotificationId();
          try {
            await LocalNotifications.schedule({
              notifications: [notificationBase(id)],
            });
            log.info("Notifications", "schedule(immediate)", { id, title });
          } catch (e) { log.error("Notifications", "schedule", e); }
        }}>
          schedule() - now
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">schedule() - delayed</p>
        <Label label="Delay (ms)">
          <Input
            value={delayMs}
            onChange={(e) => setDelayMs(e.target.value)}
            placeholder="3000"
          />
        </Label>
        <Button type="neutral" onClick={async () => {
          const id = nextNotificationId();
          const at = new Date(Date.now() + Number(delayMs));
          try {
            await LocalNotifications.schedule({
              notifications: [{ ...notificationBase(id), schedule: { at } }],
            });
            log.info("Notifications", `schedule(at +${delayMs}ms)`, { id, at: at.toISOString() });
          } catch (e) { log.error("Notifications", "schedule(at)", e); }
        }}>
          schedule() - in {delayMs} ms
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">schedule() - repeating (every 5s, 3 times)</p>
        <Button type="neutral" onClick={async () => {
          const id = nextNotificationId();
          try {
            await LocalNotifications.schedule({
              notifications: [{
                ...notificationBase(id),
                title: "Repeating notification",
                body: `ID ${id} - every 5s, max 3 times`,
                schedule: { every: "second", count: 5, repeats: true },
              }],
            });
            log.info("Notifications", "schedule(every 5s x 3)", { id });
          } catch (e) { log.error("Notifications", "schedule(repeating)", e); }
        }}>
          schedule() - every 5s, 3 times
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Queue management</p>
        <div className="grid gap-2 md:grid-cols-3">
          <Label label="Cancel pending ID">
            <Input value={cancelId} onChange={(e) => setCancelId(e.target.value)} placeholder="notification id" />
          </Label>
          <Label label="Remove delivered ID">
            <Input value={deliveredId} onChange={(e) => setDeliveredId(e.target.value)} placeholder="notification id" />
          </Label>
          <Label label="Android channel ID">
            <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} />
          </Label>
        </div>
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
          <Button type="yellow" onClick={async () => {
            try {
              await LocalNotifications.cancel({ notifications: [{ id: Number(cancelId) }] });
              log.info("Notifications", "cancel", { id: Number(cancelId) });
            } catch (e) { log.error("Notifications", "cancel", e); }
          }}>
            cancel()
          </Button>
          <Button type="yellow" onClick={async () => {
            try {
              await LocalNotifications.removeDeliveredNotifications({ notifications: [{ id: Number(deliveredId) }] as never });
              log.info("Notifications", "removeDeliveredNotifications", { id: Number(deliveredId) });
            } catch (e) { log.error("Notifications", "removeDeliveredNotifications", e); }
          }}>
            removeDelivered()
          </Button>

          <Button type="red" onClick={async () => {
            try {
              await LocalNotifications.removeAllDeliveredNotifications();
              log.info("Notifications", "removeAllDelivered", "done");
            } catch (e) { log.error("Notifications", "removeAllDelivered", e); }
          }}>
            removeAllDelivered()
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              await LocalNotifications.registerActionTypes({ types: [{ id: actionTypeId, actions: [] }] });
              log.info("Notifications", "registerActionTypes", { actionTypeId });
            } catch (e) { log.error("Notifications", "registerActionTypes", e); }
          }}>
            registerActionTypes()
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              await LocalNotifications.createChannel({ id: channelId, name: channelId, importance: 3 });
              log.info("Notifications", "createChannel", { channelId });
            } catch (e) { log.error("Notifications", "createChannel", e); }
          }}>
            createChannel()<AndroidOnly />
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Notifications", "listChannels", await LocalNotifications.listChannels()); }
            catch (e) { log.error("Notifications", "listChannels", e); }
          }}>
            listChannels()<AndroidOnly />
          </Button>
          <Button type="yellow" onClick={async () => {
            try {
              await LocalNotifications.deleteChannel({ id: channelId });
              log.info("Notifications", "deleteChannel", { channelId });
            } catch (e) { log.error("Notifications", "deleteChannel", e); }
          }}>
            deleteChannel()<AndroidOnly />
          </Button>
        </div>
      </section>
    </div>
  );
};
