import React, { useState } from "react";
import { Browser } from "@capacitor/browser";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageBrowser: React.FC = () => {
  const log = useLogger();
  const [url, setUrl] = useState("https://capacitorjs.com");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">@capacitor/browser</p>
        <p className="text-xs text-slate-500">
          Na Electronu se URL otevírá v systémovém prohlížeči přes <code>shell.openExternal</code>.
          close() a getSnapshot() jsou no-op.
        </p>
        <Label label="URL">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              await Browser.open({ url });
              log.info("Browser", "open", { url });
            } catch (e) { log.error("Browser", "open", e); }
          }}>
            Browser.open()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              await Browser.close();
              log.info("Browser", "close", "no-op na Electronu");
            } catch (e) { log.error("Browser", "close", e); }
          }}>
            Browser.close()
          </Button>
        </div>
      </section>
    </div>
  );
};
