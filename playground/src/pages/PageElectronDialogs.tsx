import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronDialogs: React.FC = () => {
  const log = useLogger();
  const [defaultPath, setDefaultPath] = useState("cap-electron.txt");
  const [message, setMessage] = useState("Hello from window.Electron.dialogs");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Open / save dialogs</p>
        <Label label="Default save path">
          <Input value={defaultPath} onChange={(e) => setDefaultPath(e.target.value)} />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { log.info("Dialogs", "showOpenDialog(file)", await window.Electron.dialogs.showOpenDialog({ properties: ["openFile"] })); }
            catch (e) { log.error("Dialogs", "showOpenDialog(file)", e); }
          }}>
            open file
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Dialogs", "showOpenDialog(multi)", await window.Electron.dialogs.showOpenDialog({ properties: ["openFile", "multiSelections"] })); }
            catch (e) { log.error("Dialogs", "showOpenDialog(multi)", e); }
          }}>
            open multiple
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Dialogs", "showOpenDialog(directory)", await window.Electron.dialogs.showOpenDialog({ properties: ["openDirectory"] })); }
            catch (e) { log.error("Dialogs", "showOpenDialog(directory)", e); }
          }}>
            open directory
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("Dialogs", "showSaveDialog", await window.Electron.dialogs.showSaveDialog({ defaultPath })); }
            catch (e) { log.error("Dialogs", "showSaveDialog", e); }
          }}>
            save dialog
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Message boxes</p>
        <Label label="Message">
          <Input value={message} onChange={(e) => setMessage(e.target.value)} />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { log.info("Dialogs", "showMessageBox(info)", await window.Electron.dialogs.showMessageBox({ type: "info", message })); }
            catch (e) { log.error("Dialogs", "showMessageBox(info)", e); }
          }}>
            message info
          </Button>
          <Button type="yellow" onClick={async () => {
            try {
              log.info("Dialogs", "showMessageBox(question)", await window.Electron.dialogs.showMessageBox({
                type: "question",
                message,
                buttons: ["Ano", "Ne", "Zrusit"],
                defaultId: 0,
                cancelId: 2,
              }));
            } catch (e) { log.error("Dialogs", "showMessageBox(question)", e); }
          }}>
            message question
          </Button>
          <Button type="red" onClick={async () => {
            try { await window.Electron.dialogs.showErrorBox({ title: "Test error box", content: message }); log.info("Dialogs", "showErrorBox", "shown"); }
            catch (e) { log.error("Dialogs", "showErrorBox", e); }
          }}>
            error box
          </Button>
        </div>
      </section>
    </div>
  );
};
