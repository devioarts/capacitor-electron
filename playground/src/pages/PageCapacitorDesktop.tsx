import React, { useEffect, useState } from "react";
import { Clipboard } from "@capacitor/clipboard";
import { Device } from "@capacitor/device";
import { Network } from "@capacitor/network";
import { FileTransfer } from "@capacitor/file-transfer";
import { FileViewer } from "@capacitor/file-viewer";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { PrivacyScreen } from "@capacitor/privacy-screen";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageCapacitorDesktop: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [clipboardText, setClipboardText] = useState("Copied from Capacitor Electron");
  const [viewerPath, setViewerPath] = useState("");
  const [resourcePath, setResourcePath] = useState("assets/icon.png");
  const [viewerUrl, setViewerUrl] = useState("https://capacitorjs.com/");
  const [downloadUrl, setDownloadUrl] = useState("https://capacitorjs.com/");
  const [downloadName, setDownloadName] = useState("cap-electron-download.html");
  const [uploadUrl, setUploadUrl] = useState("https://httpbin.org/post");
  const [uploadPath, setUploadPath] = useState("");
  const [networkListening, setNetworkListening] = useState(false);

  const sampleImage =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

  useEffect(() => {
    if (!networkListening) return;
    let remove: (() => Promise<void>) | undefined;
    Network.addListener("networkStatusChange", (status) => {
      info("Network", "networkStatusChange", status);
    }).then((handle) => { remove = handle.remove; });
    return () => { void remove?.(); };
  }, [networkListening, info]);

  useEffect(() => {
    let remove: (() => Promise<void>) | undefined;
    FileTransfer.addListener("progress", (progress) => {
      info("FileTransfer", "progress", progress);
    }).then((handle) => { remove = handle.remove; });
    return () => { void remove?.(); };
  }, [info]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Clipboard</p>
        <div className="flex flex-wrap items-end gap-2">
          <Label label="Text">
            <Input value={clipboardText} onChange={(e) => setClipboardText(e.target.value)} />
          </Label>
          <Button onClick={async () => {
            try {
              await Clipboard.write({ string: clipboardText });
              log.info("Clipboard", "write", clipboardText);
            } catch (e) { log.error("Clipboard", "write", e); }
          }}>
            write()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Clipboard", "read", await Clipboard.read()); }
            catch (e) { log.error("Clipboard", "read", e); }
          }}>
            read()
          </Button>
          <Button type="yellow" onClick={async () => {
            try {
              await Clipboard.write({ image: sampleImage });
              log.info("Clipboard", "write image", "1x1 PNG data URL");
            } catch (e) { log.error("Clipboard", "write image", e); }
          }}>
            write image()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Device / Network</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { log.info("Device", "getInfo", await Device.getInfo()); }
            catch (e) { log.error("Device", "getInfo", e); }
          }}>
            Device.getInfo()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Device", "getId", await Device.getId()); }
            catch (e) { log.error("Device", "getId", e); }
          }}>
            Device.getId()
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              log.info("Device", "language", {
                code: await Device.getLanguageCode(),
                tag: await Device.getLanguageTag(),
                battery: await Device.getBatteryInfo(),
              });
            } catch (e) { log.error("Device", "language", e); }
          }}>
            Device extras
          </Button>
          <Button onClick={async () => {
            try { log.info("Network", "getStatus", await Network.getStatus()); }
            catch (e) { log.error("Network", "getStatus", e); }
          }}>
            Network.getStatus()
          </Button>
          <Button type={networkListening ? "green" : "neutral"} onClick={() => setNetworkListening((v) => !v)}>
            {networkListening ? "Network listener ON" : "Network listener OFF"}
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">File Viewer</p>
        <div className="grid gap-2 md:grid-cols-3">
          <Label label="Local path or file:// URL">
            <Input value={viewerPath} onChange={(e) => setViewerPath(e.target.value)} placeholder="/absolute/path/file.pdf" />
          </Label>
          <Label label="Resource path">
            <Input value={resourcePath} onChange={(e) => setResourcePath(e.target.value)} placeholder="assets/icon.png" />
          </Label>
          <Label label="Remote URL">
            <Input value={viewerUrl} onChange={(e) => setViewerUrl(e.target.value)} />
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { await FileViewer.openDocumentFromLocalPath({ path: viewerPath }); log.info("FileViewer", "open local", viewerPath); }
            catch (e) { log.error("FileViewer", "open local", e); }
          }}>
            openDocumentFromLocalPath()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { await FileViewer.openDocumentFromUrl({ url: viewerUrl }); log.info("FileViewer", "open url", viewerUrl); }
            catch (e) { log.error("FileViewer", "open url", e); }
          }}>
            openDocumentFromUrl()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { await FileViewer.openDocumentFromResources({ path: resourcePath }); log.info("FileViewer", "open resource", resourcePath); }
            catch (e) { log.error("FileViewer", "open resource", e); }
          }}>
            openDocumentFromResources()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await FileViewer.previewMediaContentFromLocalPath({ path: viewerPath }); log.info("FileViewer", "preview local", viewerPath); }
            catch (e) { log.error("FileViewer", "preview local", e); }
          }}>
            previewLocal()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await FileViewer.previewMediaContentFromUrl({ url: viewerUrl }); log.info("FileViewer", "preview url", viewerUrl); }
            catch (e) { log.error("FileViewer", "preview url", e); }
          }}>
            previewUrl()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">File Transfer</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Label label="Download URL">
            <Input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} />
          </Label>
          <Label label="Cache filename">
            <Input value={downloadName} onChange={(e) => setDownloadName(e.target.value)} />
          </Label>
          <Label label="Upload URL">
            <Input value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} />
          </Label>
          <Label label="Upload path or file:// URL">
            <Input value={uploadPath} onChange={(e) => setUploadPath(e.target.value)} placeholder="Use downloaded file path or any local file" />
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try {
              const file = await Filesystem.getUri({ directory: Directory.Cache, path: downloadName });
              const result = await FileTransfer.downloadFile({ url: downloadUrl, path: file.uri, progress: true });
              log.info("FileTransfer", "downloadFile", result);
              setViewerPath(file.uri);
              setUploadPath(file.uri);
            } catch (e) { log.error("FileTransfer", "downloadFile", e); }
          }}>
            downloadFile()
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              const result = await FileTransfer.uploadFile({ url: uploadUrl, path: uploadPath, progress: true });
              log.info("FileTransfer", "uploadFile", result);
            } catch (e) { log.error("FileTransfer", "uploadFile", e); }
          }}>
            uploadFile()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await FileTransfer.removeAllListeners(); log.info("FileTransfer", "removeAllListeners", "done"); }
            catch (e) { log.error("FileTransfer", "removeAllListeners", e); }
          }}>
            removeAllListeners()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Privacy Screen</p>
        <div className="flex flex-wrap gap-2">
          <Button type="green" onClick={async () => {
            try { log.info("PrivacyScreen", "enable", await PrivacyScreen.enable()); }
            catch (e) { log.error("PrivacyScreen", "enable", e); }
          }}>
            enable()
          </Button>
          <Button type="red" onClick={async () => {
            try { log.info("PrivacyScreen", "disable", await PrivacyScreen.disable()); }
            catch (e) { log.error("PrivacyScreen", "disable", e); }
          }}>
            disable()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("PrivacyScreen", "isEnabled", await PrivacyScreen.isEnabled()); }
            catch (e) { log.error("PrivacyScreen", "isEnabled", e); }
          }}>
            isEnabled()
          </Button>
        </div>
      </section>
    </div>
  );
};
