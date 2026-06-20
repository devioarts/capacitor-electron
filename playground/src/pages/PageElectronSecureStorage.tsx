import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageElectronSecureStorage: React.FC = () => {
  const log = useLogger();
  const [key, setKey] = useState("token");
  const [secret, setSecret] = useState("desktop-secret");
  const [encrypted, setEncrypted] = useState("");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Key/value storage</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Label label="Key"><Input value={key} onChange={(e) => setKey(e.target.value)} /></Label>
          <Label label="Value"><Input value={secret} onChange={(e) => setSecret(e.target.value)} /></Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            try { await window.Electron.secureStorage.set(key, secret); log.info("SecureStorage", "set", { key }); }
            catch (e) { log.error("SecureStorage", "set", e); }
          }}>
            set()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("SecureStorage", "get", await window.Electron.secureStorage.get(key)); }
            catch (e) { log.error("SecureStorage", "get", e); }
          }}>
            get()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("SecureStorage", "keys", await window.Electron.secureStorage.keys()); }
            catch (e) { log.error("SecureStorage", "keys", e); }
          }}>
            keys()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { await window.Electron.secureStorage.remove(key); log.info("SecureStorage", "remove", { key }); }
            catch (e) { log.error("SecureStorage", "remove", e); }
          }}>
            remove()
          </Button>
          <Button type="red" onClick={async () => {
            try { await window.Electron.secureStorage.clear(); log.info("SecureStorage", "clear", "done"); }
            catch (e) { log.error("SecureStorage", "clear", e); }
          }}>
            clear()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Encryption helpers</p>
        <div className="flex flex-wrap gap-2">
          <Button type="neutral" onClick={async () => {
            try {
              log.info("SecureStorage", "status", {
                available: await window.Electron.secureStorage.isEncryptionAvailable(),
                backend: await window.Electron.secureStorage.getSelectedStorageBackend(),
              });
            } catch (e) { log.error("SecureStorage", "status", e); }
          }}>
            status()
          </Button>
          <Button type="neutral" onClick={async () => {
            try {
              const value = await window.Electron.secureStorage.encryptString(secret);
              setEncrypted(value);
              log.info("SecureStorage", "encryptString", value);
            } catch (e) { log.error("SecureStorage", "encryptString", e); }
          }}>
            encryptString()
          </Button>
          <Button type="neutral" onClick={async () => {
            try { log.info("SecureStorage", "decryptString", await window.Electron.secureStorage.decryptString(encrypted)); }
            catch (e) { log.error("SecureStorage", "decryptString", e); }
          }} disabled={!encrypted}>
            decrypt last
          </Button>
        </div>
      </section>
    </div>
  );
};
