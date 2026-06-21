// Playground page for exercising native app, context, Dock, and tray menu events.
import React, { useEffect } from "react";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageNativeMenus: React.FC = () => {
  const log = useLogger();
  const { info } = log;

  useEffect(() => {
    const off = window.Electron.onMenuAction((event) => {
      info("MenuAction", `${event.source}:${event.action}`, event.data);
    });
    return off;
  }, [info]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Native menu action listener</p>
        <p className="text-xs text-slate-500">
          This page logs actions from app, context, Dock, and tray menus through <code>window.Electron.onMenuAction()</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="neutral"
            onClick={async (event) => {
              try {
                const shown = await window.Electron.showContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  target: {
                    id: "settings-card",
                    classList: ["manual-context"],
                    dataset: { scenario: "manual-id" },
                    text: "Manual settings-card context",
                  },
                  data: { scenario: "manual-button", requestedAt: new Date().toISOString() },
                });
                log.info("ContextMenu", "showContextMenu manual id", { shown });
              } catch (e) {
                log.error("ContextMenu", "showContextMenu manual id", e);
              }
            }}
          >
            showContextMenu(settings-card)
          </Button>

          <Button
            type="neutral"
            onClick={async (event) => {
              try {
                const shown = await window.Electron.showContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  target: {
                    classList: ["context-row"],
                    dataset: { rowId: "manual-row", status: "draft" },
                    text: "Manual context row",
                  },
                  data: { scenario: "manual-row-button" },
                });
                log.info("ContextMenu", "showContextMenu manual row", { shown });
              } catch (e) {
                log.error("ContextMenu", "showContextMenu manual row", e);
              }
            }}
          >
            showContextMenu(context-row)
          </Button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div
          id="settings-card"
          data-menu-kind="settings"
          className="rounded border border-indigo-200 bg-indigo-50 p-4 text-sm text-slate-800"
        >
          <p className="font-semibold text-indigo-900">Right-click target by id</p>
          <p className="mt-1 text-slate-600">
            Right-click this card. The template context menu sees <code>ctx.target.id === "settings-card"</code>.
          </p>
        </div>

        <div className="space-y-2 rounded border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">Right-click targets by class and dataset</p>
          {[
            { id: "row-1001", name: "Invoice 1001", status: "open" },
            { id: "row-1002", name: "Invoice 1002", status: "paid" },
            { id: "row-1003", name: "Invoice 1003", status: "draft" },
          ].map((row) => (
            <div
              key={row.id}
              className="context-row flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              data-row-id={row.id}
              data-status={row.status}
            >
              <span className="font-medium text-slate-800">{row.name}</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">{row.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Standard right-click menu</p>
        <textarea
          className="min-h-24 w-full rounded border border-slate-300 bg-white p-3 text-sm"
          defaultValue="Right-click inside this editable field to test standard cut/copy/paste/select-all roles."
        />
      </section>
    </div>
  );
};
