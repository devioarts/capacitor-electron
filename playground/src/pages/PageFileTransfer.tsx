import React, { useEffect, useState } from "react";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileTransfer } from "@capacitor/file-transfer";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageFileTransfer: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [downloadUrl, setDownloadUrl] = useState("https://capacitorjs.com/");
  const [downloadName, setDownloadName] = useState("cap-electron-download.html");
  const [uploadUrl, setUploadUrl] = useState("https://httpbin.org/post");
  const [uploadPath, setUploadPath] = useState("");

  useEffect(() => {
    let remove: (() => Promise<void>) | undefined;
    FileTransfer.addListener("progress", (progress) => {
      info("FileTransfer", "progress", progress);
    }).then((handle) => { remove = handle.remove; });
    return () => { void remove?.(); };
  }, [info]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Label label="Download URL"><Input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} /></Label>
        <Label label="Cache filename"><Input value={downloadName} onChange={(e) => setDownloadName(e.target.value)} /></Label>
        <Label label="Upload URL"><Input value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} /></Label>
        <Label label="Upload path or file:// URL"><Input value={uploadPath} onChange={(e) => setUploadPath(e.target.value)} /></Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={async () => {
          try {
            const file = await Filesystem.getUri({ directory: Directory.Cache, path: downloadName });
            const result = await FileTransfer.downloadFile({ url: downloadUrl, path: file.uri, progress: true });
            setUploadPath(file.uri);
            log.info("FileTransfer", "downloadFile", result);
          } catch (e) { log.error("FileTransfer", "downloadFile", e); }
        }}>
          downloadFile()
        </Button>
        <Button type="neutral" onClick={async () => {
          try { log.info("FileTransfer", "uploadFile", await FileTransfer.uploadFile({ url: uploadUrl, path: uploadPath, progress: true })); }
          catch (e) { log.error("FileTransfer", "uploadFile", e); }
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
    </div>
  );
};
