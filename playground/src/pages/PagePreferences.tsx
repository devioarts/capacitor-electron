import React, { useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/Logger.tsx";

export const PagePreferences: React.FC = () => {
  const log = useLogger();

  const [setKey, setSetKey]     = useState("testKey");
  const [setValue, setSetValue] = useState("testValue");
  const [getKey, setGetKey]     = useState("testKey");
  const [removeKey, setRemoveKey] = useState("testKey");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">set()</p>
        <div className="flex flex-wrap gap-2">
          <Label label="Key">
            <Input value={setKey} onChange={(e) => setSetKey(e.target.value)} placeholder="klíč" />
          </Label>
          <Label label="Value">
            <Input value={setValue} onChange={(e) => setSetValue(e.target.value)} placeholder="hodnota" />
          </Label>
        </div>
        <Button type="primary" onClick={async () => {
          try {
            await Preferences.set({ key: setKey, value: setValue });
            log.info("Preferences", "set", { key: setKey, value: setValue });
          } catch (e) { log.error("Preferences", "set", e); }
        }}>
          set()
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">get()</p>
        <Label label="Key">
          <Input value={getKey} onChange={(e) => setGetKey(e.target.value)} placeholder="klíč" />
        </Label>
        <Button type="primary" onClick={async () => {
          try {
            const result = await Preferences.get({ key: getKey });
            log.info("Preferences", "get", result);
          } catch (e) { log.error("Preferences", "get", e); }
        }}>
          get()
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">remove()</p>
        <Label label="Key">
          <Input value={removeKey} onChange={(e) => setRemoveKey(e.target.value)} placeholder="klíč" />
        </Label>
        <Button type="red" onClick={async () => {
          try {
            await Preferences.remove({ key: removeKey });
            log.info("Preferences", "remove", { key: removeKey });
          } catch (e) { log.error("Preferences", "remove", e); }
        }}>
          remove()
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Ostatní</p>
        <div className="flex flex-wrap gap-2">
          <Button type="neutral" onClick={async () => {
            try {
              const result = await Preferences.keys();
              log.info("Preferences", "keys", result);
            } catch (e) { log.error("Preferences", "keys", e); }
          }}>
            keys()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const result = await Preferences.migrate();
              log.info("Preferences", "migrate", result);
            } catch (e) { log.error("Preferences", "migrate", e); }
          }}>
            migrate()
          </Button>

          <Button type="red" onClick={async () => {
            try {
              await Preferences.clear();
              log.info("Preferences", "clear", "done — všechny klíče smazány");
            } catch (e) { log.error("Preferences", "clear", e); }
          }}>
            clear() ⚠
          </Button>
        </div>
      </section>
    </div>
  );
};
