import React, { useEffect, useState } from "react";
import { InAppBrowser, ToolbarPosition, DefaultWebViewOptions, DefaultSystemBrowserOptions } from "@capacitor/inappbrowser";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

type ElectronWebViewOptions = typeof DefaultWebViewOptions & {
  electron?: {
    window?: Record<string, unknown>;
    session?: Record<string, unknown>;
    navigation?: Record<string, unknown>;
  };
};

export const PageInAppBrowser: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [url, setUrl] = useState("https://capacitorjs.com/");
  const [partition, setPartition] = useState("persist:playground-iab");
  const [userAgent, setUserAgent] = useState("");
  const [showToolbar, setShowToolbar] = useState(true);
  const [showUrl, setShowUrl] = useState(true);
  const [navButtons, setNavButtons] = useState(true);
  const [toolbarBottom, setToolbarBottom] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  useEffect(() => {
    const handles = [
      InAppBrowser.addListener("browserClosed", () => info("InAppBrowser", "browserClosed")),
      InAppBrowser.addListener("browserPageLoaded", () => info("InAppBrowser", "browserPageLoaded")),
      InAppBrowser.addListener("browserPageNavigationCompleted", (data) => info("InAppBrowser", "browserPageNavigationCompleted", data)),
    ];
    return () => { handles.forEach((handle) => void handle.then((h) => h.remove())); };
  }, [info]);

  const webViewOptions = (): ElectronWebViewOptions => ({
    ...DefaultWebViewOptions,
    showToolbar,
    showURL: showUrl,
    showNavigationButtons: navButtons,
    toolbarPosition: toolbarBottom ? ToolbarPosition.BOTTOM : ToolbarPosition.TOP,
    customWebViewUserAgent: userAgent || undefined,
    closeButtonText: "Close",
    electron: {
      window: {
        width: 1000,
        height: 720,
        title: "InAppBrowser playground",
        alwaysOnTop,
      },
      session: {
        partition,
      },
      navigation: {
        openExternalLinksInSystemBrowser: true,
      },
    },
  });

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Input</p>
        <div className="grid gap-2 md:grid-cols-3">
          <Label label="URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} /></Label>
          <Label label="Session partition"><Input value={partition} onChange={(e) => setPartition(e.target.value)} /></Label>
          <Label label="Custom user agent"><Input value={userAgent} onChange={(e) => setUserAgent(e.target.value)} placeholder="optional" /></Label>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={showToolbar} onChange={(e) => setShowToolbar(e.target.checked)} /> toolbar</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showUrl} onChange={(e) => setShowUrl(e.target.checked)} /> URL label</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={navButtons} onChange={(e) => setNavButtons(e.target.checked)} /> navigation</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={toolbarBottom} onChange={(e) => setToolbarBottom(e.target.checked)} /> bottom toolbar</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={alwaysOnTop} onChange={(e) => setAlwaysOnTop(e.target.checked)} /> always on top</label>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Open modes</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { await InAppBrowser.openInWebView({ url, options: webViewOptions() }); log.info("InAppBrowser", "openInWebView", { url }); }
            catch (e) { log.error("InAppBrowser", "openInWebView", e); }
          }}>
            openInWebView()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { await InAppBrowser.openInSystemBrowser({ url, options: DefaultSystemBrowserOptions }); log.info("InAppBrowser", "openInSystemBrowser", { url }); }
            catch (e) { log.error("InAppBrowser", "openInSystemBrowser", e); }
          }}>
            openInSystemBrowser()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { await InAppBrowser.openInExternalBrowser({ url }); log.info("InAppBrowser", "openInExternalBrowser", { url }); }
            catch (e) { log.error("InAppBrowser", "openInExternalBrowser", e); }
          }}>
            openInExternalBrowser()
          </Button>
          <Button type="red" onClick={async () => {
            try { await InAppBrowser.close(); log.info("InAppBrowser", "close", "done"); }
            catch (e) { log.error("InAppBrowser", "close", e); }
          }}>
            close()
          </Button>
          <Button type="yellow" onClick={() => {
            InAppBrowser.removeAllListeners();
            log.info("InAppBrowser", "removeAllListeners", "done");
          }}>
            removeAllListeners()
          </Button>
        </div>
      </section>
    </div>
  );
};
