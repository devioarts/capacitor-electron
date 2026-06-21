// Playground page for exercising Capacitor File Viewer document and media opening.
import React, { useState } from "react";
import { FileViewer } from "@capacitor/file-viewer";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageFileViewer: React.FC = () => {
  const log = useLogger();
  const [localPath, setLocalPath] = useState("");
  const [resourcePath, setResourcePath] = useState("assets/icon.png");
  const [url, setUrl] = useState("https://capacitorjs.com/");

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-3">
        <Label label="Local path or file:// URL">
          <Input value={localPath} onChange={(e) => setLocalPath(e.target.value)} placeholder="/absolute/path/file.pdf" />
        </Label>
        <Label label="Resource path">
          <Input value={resourcePath} onChange={(e) => setResourcePath(e.target.value)} placeholder="assets/icon.png" />
        </Label>
        <Label label="Remote URL">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
        </Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={async () => {
          try { await FileViewer.openDocumentFromLocalPath({ path: localPath }); log.info("FileViewer", "open local", localPath); }
          catch (e) { log.error("FileViewer", "open local", e); }
        }}>
          open local
        </Button>
        <Button type="neutral" onClick={async () => {
          try { await FileViewer.openDocumentFromUrl({ url }); log.info("FileViewer", "open url", url); }
          catch (e) { log.error("FileViewer", "open url", e); }
        }}>
          open url
        </Button>
        <Button type="neutral" onClick={async () => {
          try { await FileViewer.openDocumentFromResources({ path: resourcePath }); log.info("FileViewer", "open resource", resourcePath); }
          catch (e) { log.error("FileViewer", "open resource", e); }
        }}>
          open resource
        </Button>
        <Button type="yellow" onClick={async () => {
          try { await FileViewer.previewMediaContentFromLocalPath({ path: localPath }); log.info("FileViewer", "preview local", localPath); }
          catch (e) { log.error("FileViewer", "preview local", e); }
        }}>
          preview local
        </Button>
        <Button type="yellow" onClick={async () => {
          try { await FileViewer.previewMediaContentFromUrl({ url }); log.info("FileViewer", "preview url", url); }
          catch (e) { log.error("FileViewer", "preview url", e); }
        }}>
          preview url
        </Button>
      </div>
    </div>
  );
};
