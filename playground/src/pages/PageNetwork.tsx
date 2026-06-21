// Playground page for exercising Capacitor Network status and change events.
import React, { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageNetwork: React.FC = () => {
  const log = useLogger();
  const { info } = log;
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;
    let remove: (() => Promise<void>) | undefined;
    Network.addListener("networkStatusChange", (status) => {
      info("Network", "networkStatusChange", status);
    }).then((handle) => { remove = handle.remove; });
    return () => { void remove?.(); };
  }, [listening, info]);

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={async () => {
        try { log.info("Network", "getStatus", await Network.getStatus()); }
        catch (e) { log.error("Network", "getStatus", e); }
      }}>
        getStatus()
      </Button>
      <Button type={listening ? "green" : "neutral"} onClick={() => setListening((v) => !v)}>
        {listening ? "listener ON" : "listener OFF"}
      </Button>
    </div>
  );
};
