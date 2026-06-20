import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronPrint: React.FC = () => {
  const log = useLogger();
  const [pdfPath, setPdfPath] = useState("");

  return (
    <div className="space-y-4">
      <Label label="PDF path (optional)">
        <Input value={pdfPath} onChange={(e) => setPdfPath(e.target.value)} placeholder="/absolute/path/page.pdf" />
      </Label>
      <div className="flex flex-wrap gap-2">
        <Button type="neutral" onClick={async () => {
          try { log.info("Print", "getPrinters", await window.Electron.print.getPrinters()); }
          catch (e) { log.error("Print", "getPrinters", e); }
        }}>
          getPrinters()
        </Button>
        <Button type="yellow" onClick={async () => {
          try { log.info("Print", "print", await window.Electron.print.print({ silent: false })); }
          catch (e) { log.error("Print", "print", e); }
        }}>
          print()
        </Button>
        <Button type="yellow" onClick={async () => {
          try { log.info("Print", "print silent", await window.Electron.print.print({ silent: true })); }
          catch (e) { log.error("Print", "print silent", e); }
        }}>
          print silent
        </Button>
        <Button type="neutral" onClick={async () => {
          try { log.info("Print", "printToPDF", await window.Electron.print.printToPDF({ path: pdfPath || undefined })); }
          catch (e) { log.error("Print", "printToPDF", e); }
        }}>
          printToPDF()
        </Button>
      </div>
    </div>
  );
};
