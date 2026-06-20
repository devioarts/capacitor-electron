import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronCapture: React.FC = () => {
  const log = useLogger();
  const [width, setWidth] = useState("320");
  const [height, setHeight] = useState("180");

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Label label="Thumbnail width"><Input value={width} onChange={(e) => setWidth(e.target.value)} /></Label>
        <Label label="Thumbnail height"><Input value={height} onChange={(e) => setHeight(e.target.value)} /></Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={async () => {
          try { log.info("DesktopCapture", "screens", await window.Electron.desktopCapture.getSources({ types: ["screen"] })); }
          catch (e) { log.error("DesktopCapture", "screens", e); }
        }}>
          screens
        </Button>
        <Button type="neutral" onClick={async () => {
          try { log.info("DesktopCapture", "windows", await window.Electron.desktopCapture.getSources({ types: ["window"], fetchWindowIcons: true })); }
          catch (e) { log.error("DesktopCapture", "windows", e); }
        }}>
          windows + icons
        </Button>
        <Button type="neutral" onClick={async () => {
          try {
            log.info("DesktopCapture", "all with thumbnails", await window.Electron.desktopCapture.getSources({
              types: ["screen", "window"],
              thumbnailSize: { width: Number(width), height: Number(height) },
              fetchWindowIcons: true,
            }));
          } catch (e) { log.error("DesktopCapture", "all with thumbnails", e); }
        }}>
          all with thumbnails
        </Button>
      </div>
    </div>
  );
};
