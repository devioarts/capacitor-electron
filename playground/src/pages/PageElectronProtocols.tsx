import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronProtocols: React.FC = () => {
  const log = useLogger();
  const [scheme, setScheme] = useState("capelectron");
  const testUrl = `${scheme}://test/from-playground`;

  return (
    <div className="space-y-4">
      <Label label="Scheme">
        <Input value={scheme} onChange={(e) => setScheme(e.target.value)} />
      </Label>
      <div className="flex flex-wrap gap-2">
        <Button onClick={async () => {
          try { log.info("Protocols", "configured", await window.Electron.protocols.getConfiguredSchemes()); }
          catch (e) { log.error("Protocols", "configured", e); }
        }}>
          configured schemes
        </Button>
        <Button type="neutral" onClick={async () => {
          try { log.info("Protocols", "isProtocolHandled", await window.Electron.protocols.isProtocolHandled(scheme)); }
          catch (e) { log.error("Protocols", "isProtocolHandled", e); }
        }}>
          isProtocolHandled()
        </Button>
        <Button type="neutral" onClick={async () => {
          try { log.info("Protocols", "isDefaultProtocolClient", await window.Electron.protocols.isDefaultProtocolClient(scheme)); }
          catch (e) { log.error("Protocols", "isDefaultProtocolClient", e); }
        }}>
          isDefaultProtocolClient()
        </Button>
        <Button type="yellow" onClick={async () => {
          try { log.info("Protocols", "set default", await window.Electron.protocols.setAsDefaultProtocolClient(scheme)); }
          catch (e) { log.error("Protocols", "set default", e); }
        }}>
          set default
        </Button>
        <Button type="yellow" onClick={async () => {
          try { log.info("Protocols", "remove default", await window.Electron.protocols.removeAsDefaultProtocolClient(scheme)); }
          catch (e) { log.error("Protocols", "remove default", e); }
        }}>
          remove default
        </Button>
        <Button type="neutral" onClick={async () => {
          try { await window.Electron.protocols.openExternal(testUrl); log.info("Protocols", "openExternal", testUrl); }
          catch (e) { log.error("Protocols", "openExternal", e); }
        }}>
          open test URL
        </Button>
      </div>
    </div>
  );
};
