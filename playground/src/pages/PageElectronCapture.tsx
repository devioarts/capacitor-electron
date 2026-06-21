// Playground page for exercising Electron desktop capture source enumeration.
import React, { useState } from "react";
import type { DesktopCaptureSource } from "@devioarts/capacitor-electron";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronCapture: React.FC = () => {
  const log = useLogger();
  const [width, setWidth] = useState("320");
  const [height, setHeight] = useState("180");
  const [fetchIcons, setFetchIcons] = useState(true);
  const [sources, setSources] = useState<DesktopCaptureSource[]>([]);

  const getSources = async (types: Array<"window" | "screen">) => {
    try {
      const result = await window.Electron.desktopCapture.getSources({
        types,
        thumbnailSize: { width: Number(width) || 320, height: Number(height) || 180 },
        fetchWindowIcons: fetchIcons,
      });
      setSources(result);
      log.info("DesktopCapture", types.join("+"), result.map((s) => ({ id: s.id, name: s.name, hasThumbnail: !!s.thumbnail })));
    } catch (e) {
      log.error("DesktopCapture", types.join("+"), e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Label label="Thumbnail width"><Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} /></Label>
        <Label label="Thumbnail height"><Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} /></Label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={fetchIcons} onChange={(e) => setFetchIcons(e.target.checked)} />
        fetchWindowIcons
      </label>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => getSources(["screen"])}>screens</Button>
        <Button type="neutral" onClick={() => getSources(["window"])}>windows</Button>
        <Button type="neutral" onClick={() => getSources(["screen", "window"])}>all</Button>
        {sources.length > 0 && (
          <Button type="yellow" onClick={() => setSources([])}>clear</Button>
        )}
      </div>
      {sources.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => (
            <div key={s.id} className="rounded border border-slate-200 bg-slate-50 p-2 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {s.appIcon && (
                  <img src={s.appIcon} alt="" className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="font-medium text-slate-700 truncate">{s.name}</span>
              </div>
              <p className="font-mono text-slate-400 truncate text-[10px]">{s.id}</p>
              {s.thumbnail ? (
                <img src={s.thumbnail} alt={s.name} className="w-full rounded border border-slate-200 bg-black" />
              ) : (
                <div className="flex items-center justify-center h-12 rounded border border-dashed border-slate-200 text-slate-400">
                  no thumbnail
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
