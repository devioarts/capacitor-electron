import React, { useState } from "react";
import type { ManagedWindowInfo } from "@devioarts/capacitor-electron";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronManagedWindows: React.FC = () => {
  const log = useLogger();
  const [url, setUrl] = useState("https://capacitorjs.com/");
  const [title, setTitle] = useState("Managed test window");
  const [windows, setWindows] = useState<ManagedWindowInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const refreshList = async () => {
    try {
      const list = await window.Electron.windows.list();
      setWindows(list);
      if (selectedId !== null && !list.find((w) => w.id === selectedId)) setSelectedId(null);
      log.info("Windows", "list", list);
    } catch (e) { log.error("Windows", "list", e); }
  };

  const selected = windows.find((w) => w.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Label label="Window URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} /></Label>
        <Label label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={async () => {
          try {
            const created = await window.Electron.windows.create({ url, title, width: 900, height: 700 });
            setWindows((prev) => [...prev.filter((w) => w.id !== created.id), created]);
            setSelectedId(created.id);
            log.info("Windows", "create", created);
          } catch (e) { log.error("Windows", "create", e); }
        }}>
          create()
        </Button>
        <Button type="neutral" onClick={refreshList}>list()</Button>
        <Button type="neutral" onClick={async () => {
          try { await window.Electron.windows.openExternal(url); log.info("Windows", "openExternal", url); }
          catch (e) { log.error("Windows", "openExternal", e); }
        }}>
          openExternal()
        </Button>
      </div>

      {windows.length > 0 && (
        <>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tracked windows — click to select</p>
            {windows.map((w) => (
              <div
                key={w.id}
                onClick={() => setSelectedId(w.id === selectedId ? null : w.id)}
                className={`flex items-center gap-3 rounded border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  selectedId === w.id
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="font-mono text-xs text-slate-400 w-6 flex-shrink-0">{w.id}</span>
                <span className="flex-1 truncate font-medium text-slate-800">{w.title || "(untitled)"}</span>
                {w.isMinimized && <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-100 text-amber-700">minimized</span>}
                {w.isMaximized && <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-sky-100 text-sky-700">maximized</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${
                  w.isDestroyed
                    ? "bg-red-100 text-red-600"
                    : w.isVisible
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                }`}>
                  {w.isDestroyed ? "destroyed" : w.isVisible ? "visible" : "hidden"}
                </span>
              </div>
            ))}
          </div>

          {selected && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Actions — window #{selected.id}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="neutral" onClick={async () => {
                  try { await window.Electron.windows.focus(selected.id); log.info("Windows", "focus", selected.id); await refreshList(); }
                  catch (e) { log.error("Windows", "focus", e); }
                }}>focus</Button>
                <Button type="neutral" onClick={async () => {
                  try { await window.Electron.windows.show(selected.id); log.info("Windows", "show", selected.id); await refreshList(); }
                  catch (e) { log.error("Windows", "show", e); }
                }}>show</Button>
                <Button type="neutral" onClick={async () => {
                  try { await window.Electron.windows.hide(selected.id); log.info("Windows", "hide", selected.id); await refreshList(); }
                  catch (e) { log.error("Windows", "hide", e); }
                }}>hide</Button>
                <Button type="yellow" onClick={async () => {
                  try {
                    await window.Electron.windows.setBounds(selected.id, { x: 80, y: 80, width: 720, height: 520 });
                    log.info("Windows", "setBounds", selected.id);
                    await refreshList();
                  } catch (e) { log.error("Windows", "setBounds", e); }
                }}>setBounds</Button>
                <Button type="red" onClick={async () => {
                  try {
                    await window.Electron.windows.close(selected.id);
                    log.info("Windows", "close", selected.id);
                    setWindows((prev) => prev.filter((w) => w.id !== selected.id));
                    setSelectedId(null);
                  } catch (e) { log.error("Windows", "close", e); }
                }}>close</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
