import React, { useEffect, useState } from "react";
import {
  AndroidViewStyle,
  DefaultSystemBrowserOptions,
  DefaultWebViewOptions,
  DismissStyle,
  InAppBrowser,
  iOSViewStyle,
  ToolbarPosition,
} from "@capacitor/inappbrowser";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { PlatformSupport } from "../components/PlatformSupport.tsx";
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
  const [closeButtonText, setCloseButtonText] = useState("Close");
  const [windowTitle, setWindowTitle] = useState("InAppBrowser playground");
  const [width, setWidth] = useState("1000");
  const [height, setHeight] = useState("720");
  const [minWidth, setMinWidth] = useState("");
  const [minHeight, setMinHeight] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [opacity, setOpacity] = useState("1");
  const [showToolbar, setShowToolbar] = useState(true);
  const [showUrl, setShowUrl] = useState(true);
  const [navButtons, setNavButtons] = useState(true);
  const [toolbarBottom, setToolbarBottom] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [modal, setModal] = useState(false);
  const [resizable, setResizable] = useState(true);
  const [fullscreenable, setFullscreenable] = useState(true);
  const [closable, setClosable] = useState(true);
  const [movable, setMovable] = useState(true);
  const [titleBarStyle, setTitleBarStyle] = useState<"default" | "hidden" | "hiddenInset">("default");
  const [clearCache, setClearCache] = useState(false);
  const [clearStorage, setClearStorage] = useState(false);
  const [externalLinks, setExternalLinks] = useState(true);
  const [iosViewStyle, setIosViewStyle] = useState<iOSViewStyle>(iOSViewStyle.FORM_SHEET);
  const [systemIosViewStyle, setSystemIosViewStyle] = useState<iOSViewStyle>(iOSViewStyle.PAGE_SHEET);
  const [androidViewStyle, setAndroidViewStyle] = useState<AndroidViewStyle>(AndroidViewStyle.BOTTOM_SHEET);
  const [bottomSheetHeight, setBottomSheetHeight] = useState("600");
  const [bottomSheetFixed, setBottomSheetFixed] = useState(false);

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
    clearCache,
    clearSessionCache: clearStorage,
    closeButtonText,
    iOS: {
      ...DefaultWebViewOptions.iOS,
      viewStyle: modal ? iosViewStyle : iOSViewStyle.FULL_SCREEN,
    },
    electron: {
      window: {
        width: Number(width) || undefined,
        height: Number(height) || undefined,
        minWidth: Number(minWidth) || undefined,
        minHeight: Number(minHeight) || undefined,
        title: windowTitle,
        alwaysOnTop,
        modal,
        resizable,
        fullscreenable,
        closable,
        movable,
        titleBarStyle,
        backgroundColor,
        opacity: Number(opacity) || undefined,
      },
      session: {
        partition,
        clearCache,
        clearStorage,
      },
      navigation: {
        openExternalLinksInSystemBrowser: externalLinks,
      },
    },
  });

  const systemBrowserOptions = () => ({
    ...DefaultSystemBrowserOptions,
    iOS: {
      ...DefaultSystemBrowserOptions.iOS,
      viewStyle: systemIosViewStyle,
      closeButtonText: DismissStyle.CLOSE,
    },
    android: {
      ...DefaultSystemBrowserOptions.android,
      viewStyle: androidViewStyle,
      bottomSheetOptions: androidViewStyle === AndroidViewStyle.BOTTOM_SHEET
        ? {
            height: Number(bottomSheetHeight) || 600,
            isFixed: bottomSheetFixed,
          }
        : undefined,
    },
  });

  return (
    <div className="space-y-6">
      <PlatformSupport
        title="Electron behavior"
        platforms={["Electron", "iOS", "Android"]}
        notes={
          <>
            Electron supports the WebView mode with an app-owned BrowserWindow, observable close/load/navigation events,
            controlled session partitioning, and a sanitized subset of Electron window options. System and external modes
            use <code>shell.openExternal</code>; mobile modal options are passed through for iOS/Android compatibility.
          </>
        }
      />

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Input</p>
        <div className="grid gap-2 md:grid-cols-3">
          <Label label="URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} /></Label>
          <Label label="Session partition"><Input value={partition} onChange={(e) => setPartition(e.target.value)} /></Label>
          <Label label="Custom user agent"><Input value={userAgent} onChange={(e) => setUserAgent(e.target.value)} placeholder="optional" /></Label>
          <Label label="Close button text"><Input value={closeButtonText} onChange={(e) => setCloseButtonText(e.target.value)} /></Label>
          <Label label="Window title"><Input value={windowTitle} onChange={(e) => setWindowTitle(e.target.value)} /></Label>
          <Label label="Background color"><Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} /></Label>
          <Label label="Width"><Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} /></Label>
          <Label label="Height"><Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} /></Label>
          <Label label="Min width"><Input type="number" value={minWidth} onChange={(e) => setMinWidth(e.target.value)} placeholder="optional" /></Label>
          <Label label="Min height"><Input type="number" value={minHeight} onChange={(e) => setMinHeight(e.target.value)} placeholder="optional" /></Label>
          <Label label="Opacity"><Input type="number" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(e.target.value)} /></Label>
          <Label label="Title bar style (macOS)">
            <select
              value={titleBarStyle}
              onChange={(e) => setTitleBarStyle(e.target.value as "default" | "hidden" | "hiddenInset")}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-full"
            >
              <option value="default">default</option>
              <option value="hidden">hidden</option>
              <option value="hiddenInset">hiddenInset</option>
            </select>
          </Label>
          <Label label="iOS WebView style">
            <select
              value={iosViewStyle}
              onChange={(e) => setIosViewStyle(Number(e.target.value) as iOSViewStyle)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-full"
            >
              <option value={iOSViewStyle.PAGE_SHEET}>PAGE_SHEET</option>
              <option value={iOSViewStyle.FORM_SHEET}>FORM_SHEET</option>
              <option value={iOSViewStyle.FULL_SCREEN}>FULL_SCREEN</option>
            </select>
          </Label>
          <Label label="iOS System style">
            <select
              value={systemIosViewStyle}
              onChange={(e) => setSystemIosViewStyle(Number(e.target.value) as iOSViewStyle)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-full"
            >
              <option value={iOSViewStyle.PAGE_SHEET}>PAGE_SHEET</option>
              <option value={iOSViewStyle.FORM_SHEET}>FORM_SHEET</option>
              <option value={iOSViewStyle.FULL_SCREEN}>FULL_SCREEN</option>
            </select>
          </Label>
          <Label label="Android System style">
            <select
              value={androidViewStyle}
              onChange={(e) => setAndroidViewStyle(Number(e.target.value) as AndroidViewStyle)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-full"
            >
              <option value={AndroidViewStyle.BOTTOM_SHEET}>BOTTOM_SHEET</option>
              <option value={AndroidViewStyle.FULL_SCREEN}>FULL_SCREEN</option>
            </select>
          </Label>
          <Label label="Bottom sheet height">
            <Input type="number" value={bottomSheetHeight} onChange={(e) => setBottomSheetHeight(e.target.value)} />
          </Label>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={showToolbar} onChange={(e) => setShowToolbar(e.target.checked)} /> toolbar</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showUrl} onChange={(e) => setShowUrl(e.target.checked)} /> URL label</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={navButtons} onChange={(e) => setNavButtons(e.target.checked)} /> navigation</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={toolbarBottom} onChange={(e) => setToolbarBottom(e.target.checked)} /> bottom toolbar</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={alwaysOnTop} onChange={(e) => setAlwaysOnTop(e.target.checked)} /> always on top</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={modal} onChange={(e) => setModal(e.target.checked)} /> modal</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={resizable} onChange={(e) => setResizable(e.target.checked)} /> resizable</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={fullscreenable} onChange={(e) => setFullscreenable(e.target.checked)} /> fullscreenable</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={closable} onChange={(e) => setClosable(e.target.checked)} /> closable</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={movable} onChange={(e) => setMovable(e.target.checked)} /> movable</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={clearCache} onChange={(e) => setClearCache(e.target.checked)} /> clear cache</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={clearStorage} onChange={(e) => setClearStorage(e.target.checked)} /> clear storage</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={externalLinks} onChange={(e) => setExternalLinks(e.target.checked)} /> external links in system browser</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={bottomSheetFixed} onChange={(e) => setBottomSheetFixed(e.target.checked)} /> fixed bottom sheet</label>
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
            try {
              const options = systemBrowserOptions();
              await InAppBrowser.openInSystemBrowser({ url, options });
              log.info("InAppBrowser", "openInSystemBrowser", { url, options });
            }
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
