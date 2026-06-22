// Playground page for exercising the Capacitor Browser window implementation.
import React, { useEffect, useState } from "react";
import { Browser } from "@capacitor/browser";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { PlatformSupport } from "../components/PlatformSupport.tsx";
import { useLogger } from "../components/logger-context";

export const PageBrowser: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [url, setUrl] = useState("https://capacitorjs.com");
  const [windowName, setWindowName] = useState("_blank");
  const [toolbarColor, setToolbarColor] = useState("#1d4ed8");
  const [presentationStyle, setPresentationStyle] = useState<"fullscreen" | "popover">("fullscreen");
  const [width, setWidth] = useState("900");
  const [height, setHeight] = useState("700");
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;
    const handles = [
      Browser.addListener("browserFinished", () => info("Browser", "browserFinished")),
      Browser.addListener("browserPageLoaded", () => info("Browser", "browserPageLoaded")),
    ];
    return () => { handles.forEach((handle) => void handle.then((h) => h.remove())); };
  }, [listening, info]);

  const openOptions = () => ({
    url,
    windowName,
    toolbarColor,
    presentationStyle,
    width: Number(width) || undefined,
    height: Number(height) || undefined,
  });

  return (
    <div className="space-y-6">
      <PlatformSupport
        title="Electron behavior"
        platforms={["Electron", "iOS", "Android", "Web"]}
        notes={
          <>
            Electron opens an app-owned browser window, not the user's default browser. It supports
            close/load events and maps <code>width</code>, <code>height</code>,{" "}
            <code>toolbarColor</code>, and fullscreen presentation where possible.{" "}
            <code>windowName</code> is web-only and is ignored on Electron.
          </>
        }
      />

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">@capacitor/browser</p>
        <p className="text-xs text-slate-500">
          Electron uses the same internal browser window machinery as InAppBrowser so the page can be
          closed and observed from the renderer.
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <Label label="URL">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </Label>
          <Label label="windowName">
            <Input value={windowName} onChange={(e) => setWindowName(e.target.value)} placeholder="_blank" />
          </Label>
          <Label label="toolbarColor">
            <Input value={toolbarColor} onChange={(e) => setToolbarColor(e.target.value)} placeholder="#1d4ed8" />
          </Label>
          <Label label="presentationStyle">
            <select
              value={presentationStyle}
              onChange={(e) => setPresentationStyle(e.target.value as "fullscreen" | "popover")}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-full"
            >
              <option value="fullscreen">fullscreen</option>
              <option value="popover">popover</option>
            </select>
          </Label>
          <Label label="width">
            <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
          </Label>
          <Label label="height">
            <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              const options = openOptions();
              await Browser.open(options);
              log.info("Browser", "open", options);
            } catch (e) { log.error("Browser", "open", e); }
          }}>
            Browser.open()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              await Browser.close();
              log.info("Browser", "close", "done");
            } catch (e) { log.error("Browser", "close", e); }
          }}>
            Browser.close()
          </Button>

          <Button type={listening ? "green" : "neutral"} onClick={() => setListening((v) => !v)}>
            {listening ? "Events ON" : "Events OFF"}
          </Button>

          <Button type="yellow" onClick={async () => {
            try { await Browser.removeAllListeners(); log.info("Browser", "removeAllListeners", "done"); }
            catch (e) { log.error("Browser", "removeAllListeners", e); }
          }}>
            removeAllListeners()
          </Button>

        </div>
      </section>
    </div>
  );
};
