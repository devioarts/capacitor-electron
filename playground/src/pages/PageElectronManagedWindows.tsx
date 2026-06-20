import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronManagedWindows: React.FC = () => {
  const log = useLogger();
  const [url, setUrl] = useState("https://capacitorjs.com/");
  const [title, setTitle] = useState("Managed test window");
  const [lastId, setLastId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Label label="Window URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} /></Label>
        <Label label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={async () => {
          try {
            const created = await window.Electron.windows.create({ url, title, width: 900, height: 700 });
            setLastId(created.id);
            log.info("Windows", "create", created);
          } catch (e) { log.error("Windows", "create", e); }
        }}>
          create()
        </Button>
        <Button type="neutral" onClick={async () => {
          try { log.info("Windows", "list", await window.Electron.windows.list()); }
          catch (e) { log.error("Windows", "list", e); }
        }}>
          list()
        </Button>
        <Button type="neutral" onClick={async () => {
          try { if (lastId != null) await window.Electron.windows.focus(lastId); log.info("Windows", "focus", lastId); }
          catch (e) { log.error("Windows", "focus", e); }
        }} disabled={lastId == null}>
          focus last
        </Button>
        <Button type="neutral" onClick={async () => {
          try { if (lastId != null) await window.Electron.windows.hide(lastId); log.info("Windows", "hide", lastId); }
          catch (e) { log.error("Windows", "hide", e); }
        }} disabled={lastId == null}>
          hide last
        </Button>
        <Button type="neutral" onClick={async () => {
          try { if (lastId != null) await window.Electron.windows.show(lastId); log.info("Windows", "show", lastId); }
          catch (e) { log.error("Windows", "show", e); }
        }} disabled={lastId == null}>
          show last
        </Button>
        <Button type="yellow" onClick={async () => {
          try { if (lastId != null) await window.Electron.windows.setBounds(lastId, { x: 80, y: 80, width: 720, height: 520 }); log.info("Windows", "setBounds", lastId); }
          catch (e) { log.error("Windows", "setBounds", e); }
        }} disabled={lastId == null}>
          setBounds last
        </Button>
        <Button type="red" onClick={async () => {
          try { if (lastId != null) await window.Electron.windows.close(lastId); log.info("Windows", "close", lastId); setLastId(null); }
          catch (e) { log.error("Windows", "close", e); }
        }} disabled={lastId == null}>
          close last
        </Button>
        <Button type="neutral" onClick={async () => {
          try { await window.Electron.windows.openExternal(url); log.info("Windows", "openExternal", url); }
          catch (e) { log.error("Windows", "openExternal", e); }
        }}>
          openExternal()
        </Button>
      </div>
    </div>
  );
};
