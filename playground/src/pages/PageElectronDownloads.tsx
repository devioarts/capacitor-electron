import React, { useEffect, useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronDownloads: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [url, setUrl] = useState("https://capacitorjs.com/");
  const [savePath, setSavePath] = useState("");
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    return window.Electron.downloads.on((event) => info("Downloads", event.type, event.data));
  }, [info]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Label label="Download URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} /></Label>
        <Label label="Save path (optional)"><Input value={savePath} onChange={(e) => setSavePath(e.target.value)} placeholder="/absolute/path/file.bin" /></Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={async () => {
          try {
            const started = await window.Electron.downloads.start({ url, savePath: savePath || undefined });
            setActiveId(started.id);
            log.info("Downloads", "start", started);
          } catch (e) { log.error("Downloads", "start", e); }
        }}>
          start()
        </Button>
        <Button type="neutral" onClick={async () => {
          try { log.info("Downloads", "getActive", await window.Electron.downloads.getActive()); }
          catch (e) { log.error("Downloads", "getActive", e); }
        }}>
          getActive()
        </Button>
        <Button type="yellow" onClick={async () => {
          try { await window.Electron.downloads.pause(activeId); log.info("Downloads", "pause", activeId); }
          catch (e) { log.error("Downloads", "pause", e); }
        }} disabled={!activeId}>
          pause active
        </Button>
        <Button type="yellow" onClick={async () => {
          try { await window.Electron.downloads.resume(activeId); log.info("Downloads", "resume", activeId); }
          catch (e) { log.error("Downloads", "resume", e); }
        }} disabled={!activeId}>
          resume active
        </Button>
        <Button type="red" onClick={async () => {
          try { await window.Electron.downloads.cancel(activeId); log.info("Downloads", "cancel", activeId); }
          catch (e) { log.error("Downloads", "cancel", e); }
        }} disabled={!activeId}>
          cancel active
        </Button>
      </div>
    </div>
  );
};
