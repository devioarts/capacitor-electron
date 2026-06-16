import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageWindow: React.FC = () => {
  const log = useLogger();
  const E = window.Electron;
  const [badgeCount, setBadgeCountState] = useState("5");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Stav okna</p>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              const v = await E.isMaximized();
              log.info("Electron", "isMaximized", v);
            } catch (e) { log.error("Electron", "isMaximized", e); }
          }}>
            isMaximized()
          </Button>

          <Button type="primary" onClick={async () => {
            try {
              const v = await E.isFullscreen();
              log.info("Electron", "isFullscreen", v);
            } catch (e) { log.error("Electron", "isFullscreen", e); }
          }}>
            isFullscreen()
          </Button>

          <Button type="primary" onClick={async () => {
            try {
              const v = await E.getAppVersion();
              log.info("Electron", "getAppVersion", v);
            } catch (e) { log.error("Electron", "getAppVersion", e); }
          }}>
            getAppVersion()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Ovládání okna</p>
        <div className="flex flex-wrap gap-2">
          <Button type="neutral" onClick={async () => {
            try { await E.minimize(); log.info("Electron", "minimize", "done"); }
            catch (e) { log.error("Electron", "minimize", e); }
          }}>minimize()</Button>

          <Button type="neutral" onClick={async () => {
            try { await E.maximize(); log.info("Electron", "maximize", "done"); }
            catch (e) { log.error("Electron", "maximize", e); }
          }}>maximize()</Button>

          <Button type="neutral" onClick={async () => {
            try { await E.unmaximize(); log.info("Electron", "unmaximize", "done"); }
            catch (e) { log.error("Electron", "unmaximize", e); }
          }}>unmaximize()</Button>

          <Button type="neutral" onClick={async () => {
            try { await E.toggleMaximize(); log.info("Electron", "toggleMaximize", "done"); }
            catch (e) { log.error("Electron", "toggleMaximize", e); }
          }}>toggleMaximize()</Button>

          <Button type="neutral" onClick={async () => {
            try { await E.focus(); log.info("Electron", "focus", "done"); }
            catch (e) { log.error("Electron", "focus", e); }
          }}>focus()</Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Fullscreen</p>
        <div className="flex flex-wrap gap-2">
          <Button type="yellow" onClick={async () => {
            try { await E.setFullscreen(true); log.info("Electron", "setFullscreen(true)", "done"); }
            catch (e) { log.error("Electron", "setFullscreen", e); }
          }}>setFullscreen(true)</Button>

          <Button type="yellow" onClick={async () => {
            try { await E.setFullscreen(false); log.info("Electron", "setFullscreen(false)", "done"); }
            catch (e) { log.error("Electron", "setFullscreen", e); }
          }}>setFullscreen(false)</Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">DevTools</p>
        <div className="flex flex-wrap gap-2">
          <Button type="neutral" onClick={async () => {
            try { await E.openDevTools(); log.info("Electron", "openDevTools", "done"); }
            catch (e) { log.error("Electron", "openDevTools", e); }
          }}>openDevTools()</Button>

          <Button type="neutral" onClick={async () => {
            try { await E.closeDevTools(); log.info("Electron", "closeDevTools", "done"); }
            catch (e) { log.error("Electron", "closeDevTools", e); }
          }}>closeDevTools()</Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Badge count</p>
        <p className="text-xs text-slate-500">
          Nastaví číslo na ikoně v Docku (macOS) nebo taskbaru. 0 = odstraní badge.
        </p>
        <Label label="Počet">
          <Input
            type="number"
            min="0"
            value={badgeCount}
            onChange={(e) => setBadgeCountState(e.target.value)}
          />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              const n = parseInt(badgeCount, 10) || 0;
              const ok = await E.setBadgeCount(n);
              log.info("Electron", `setBadgeCount(${n})`, { ok });
            } catch (e) { log.error("Electron", "setBadgeCount", e); }
          }}>
            setBadgeCount()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const ok = await E.setBadgeCount(0);
              log.info("Electron", "setBadgeCount(0)", { ok });
            } catch (e) { log.error("Electron", "setBadgeCount(0)", e); }
          }}>
            Clear badge
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const n = await E.getBadgeCount();
              log.info("Electron", "getBadgeCount", n);
            } catch (e) { log.error("Electron", "getBadgeCount", e); }
          }}>
            getBadgeCount()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Nebezpečné akce</p>
        <div className="flex flex-wrap gap-2">
          <Button type="red" onClick={async () => {
            try { await E.reload(); log.info("Electron", "reload", "done"); }
            catch (e) { log.error("Electron", "reload", e); }
          }}>reload() ⚠</Button>

          <Button type="red" onClick={async () => {
            try { await E.quit(); }
            catch (e) { log.error("Electron", "quit", e); }
          }}>quit() ⚠</Button>
        </div>
      </section>
    </div>
  );
};
