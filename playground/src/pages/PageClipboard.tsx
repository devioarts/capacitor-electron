import React, { useState } from "react";
import { Clipboard } from "@capacitor/clipboard";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

const sampleImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export const PageClipboard: React.FC = () => {
  const log = useLogger();
  const [text, setText] = useState("Copied from Capacitor Electron");
  const [url, setUrl] = useState("https://capacitorjs.com");

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Label label="Text"><Input value={text} onChange={(e) => setText(e.target.value)} /></Label>
        <Label label="URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} /></Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={async () => {
          try { await Clipboard.write({ string: text }); log.info("Clipboard", "write string", text); }
          catch (e) { log.error("Clipboard", "write string", e); }
        }}>
          write string
        </Button>
        <Button type="neutral" onClick={async () => {
          try { await Clipboard.write({ url }); log.info("Clipboard", "write url", url); }
          catch (e) { log.error("Clipboard", "write url", e); }
        }}>
          write url
        </Button>
        <Button type="yellow" onClick={async () => {
          try { await Clipboard.write({ image: sampleImage }); log.info("Clipboard", "write image", "1x1 PNG data URL"); }
          catch (e) { log.error("Clipboard", "write image", e); }
        }}>
          write image
        </Button>
        <Button type="neutral" onClick={async () => {
          try { log.info("Clipboard", "read", await Clipboard.read()); }
          catch (e) { log.error("Clipboard", "read", e); }
        }}>
          read()
        </Button>
      </div>
    </div>
  );
};
