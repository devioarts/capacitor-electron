// Playground page for observing deep link delivery through App and Electron events.
import React, { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

interface DeepLinkEvent {
  url: string;
  receivedAt: string;
}

export const PageDeepLink: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [scheme, setScheme] = useState("capelectron");
  const [events, setEvents] = useState<DeepLinkEvent[]>([]);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;

    const unsub = window.Electron?.onDeepLink?.((data) => {
      const entry: DeepLinkEvent = { url: data.url, receivedAt: new Date().toLocaleTimeString() };
      setEvents((prev) => [entry, ...prev]);
      info("DeepLink", "received", data);
    });

    return unsub;
  }, [listening, info]);

  const sanitizeScheme = (v: string) => v.toLowerCase().replace(/[^a-z0-9+\-.]/g, "");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Scheme</p>
        <p className="text-xs text-slate-500">
          Must match <code>app.deepLinkingScheme</code> in <code>capacitor.config.ts</code>.
        </p>
        <Label label="Scheme">
          <Input
            value={scheme}
            onChange={(e) => setScheme(sanitizeScheme(e.target.value))}
            placeholder="myapp"
          />
        </Label>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Listener state</p>
        <Button
          type={listening ? "green" : "neutral"}
          onClick={() => {
            if (!listening) log.info("DeepLink", "listener started");
            else log.info("DeepLink", "listener stopped");
            setListening((v) => !v);
          }}
        >
          {listening ? "Listener ON" : "Listener OFF"}
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">How to test a deep link</p>
        <div className="rounded bg-slate-100 p-3 space-y-2 text-sm font-mono text-slate-700">
          <p className="text-xs text-slate-500 font-sans font-medium">macOS (Terminal)</p>
          <p>open {scheme}://hello/world</p>
          <p>open {scheme}://test?foo=bar&amp;baz=1</p>
          <div className="border-t border-slate-200 pt-2 mt-2">
            <p className="text-xs text-slate-500 font-sans font-medium">Windows (CMD)</p>
            <p>start {scheme}://hello/world</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          The scheme is registered through <code>app.setAsDefaultProtocolClient()</code> on startup.
          macOS can test this immediately; Windows usually requires a packaged build.
        </p>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">
          getLaunchUrl() — URL used to launch the app
        </p>
        <Button
          type="primary"
          onClick={async () => {
            try {
              const result = await App.getLaunchUrl();
              log.info("App", "getLaunchUrl", result ?? "(no launch URL)");
            } catch (e) {
              log.error("App", "getLaunchUrl", e);
            }
          }}
        >
          App.getLaunchUrl()
        </Button>
      </section>

      {events.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Received events</p>
            <button
              className="text-xs text-slate-400 hover:text-slate-600"
              onClick={() => setEvents([])}
            >
              Clear
            </button>
          </div>
          <div className="space-y-1">
            {events.map((e, i) => (
              <div key={i} className="rounded bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-400 text-xs mr-2">{e.receivedAt}</span>
                <span className="font-mono">{e.url}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
