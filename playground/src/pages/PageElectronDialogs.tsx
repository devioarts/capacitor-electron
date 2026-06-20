import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

const FILTER_PRESETS = [
  { label: "Images",    filters: [{ name: "Images",    extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }] },
  { label: "Documents", filters: [{ name: "Documents", extensions: ["pdf", "doc", "docx", "txt", "md"] }] },
  { label: "Web",       filters: [{ name: "Web files", extensions: ["html", "css", "js", "ts", "json"] }] },
  { label: "All files", filters: [{ name: "All Files", extensions: ["*"] }] },
];

export const PageElectronDialogs: React.FC = () => {
  const log = useLogger();
  const [defaultPath, setDefaultPath] = useState("cap-electron.txt");
  const [message, setMessage] = useState("Hello from window.Electron.dialogs");
  const [filterPreset, setFilterPreset] = useState<number | null>(null);
  const [customExts, setCustomExts] = useState("");

  const getFilters = () => {
    if (filterPreset !== null) return FILTER_PRESETS[filterPreset].filters;
    if (customExts.trim()) {
      const exts = customExts.split(",").map((e) => e.trim().replace(/^\./, "")).filter(Boolean);
      return [{ name: "Custom", extensions: exts }];
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">File type filters</p>
        <p className="text-xs text-slate-500">
          Select a preset or enter custom extensions (comma-separated, e.g. <code>png,jpg</code>). No selection = no filter.
        </p>
        <div className="flex flex-wrap gap-2">
          {FILTER_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => { setFilterPreset(filterPreset === i ? null : i); setCustomExts(""); }}
              className={`px-3 py-1 rounded border text-xs font-medium transition-colors ${
                filterPreset === i
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-300 text-slate-700 hover:border-indigo-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Label label="Custom extensions">
          <Input
            value={customExts}
            onChange={(e) => { setCustomExts(e.target.value); setFilterPreset(null); }}
            placeholder="png, jpg, pdf"
          />
        </Label>
        {getFilters() && (
          <p className="text-xs font-mono text-slate-500 truncate">
            filters: {JSON.stringify(getFilters())}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Open / save dialogs</p>
        <Label label="Default save path">
          <Input value={defaultPath} onChange={(e) => setDefaultPath(e.target.value)} />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try {
              log.info("Dialogs", "showOpenDialog(file)", await window.Electron.dialogs.showOpenDialog({
                properties: ["openFile"],
                filters: getFilters(),
              }));
            } catch (e) { log.error("Dialogs", "showOpenDialog(file)", e); }
          }}>
            open file
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              log.info("Dialogs", "showOpenDialog(multi)", await window.Electron.dialogs.showOpenDialog({
                properties: ["openFile", "multiSelections"],
                filters: getFilters(),
              }));
            } catch (e) { log.error("Dialogs", "showOpenDialog(multi)", e); }
          }}>
            open multiple
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              log.info("Dialogs", "showOpenDialog(directory)", await window.Electron.dialogs.showOpenDialog({
                properties: ["openDirectory"],
              }));
            } catch (e) { log.error("Dialogs", "showOpenDialog(directory)", e); }
          }}>
            open directory
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              log.info("Dialogs", "showSaveDialog", await window.Electron.dialogs.showSaveDialog({
                defaultPath,
                filters: getFilters(),
              }));
            } catch (e) { log.error("Dialogs", "showSaveDialog", e); }
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
                buttons: ["Yes", "No", "Cancel"],
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
