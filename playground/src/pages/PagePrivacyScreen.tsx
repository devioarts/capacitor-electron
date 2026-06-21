// Playground page for exercising Capacitor Privacy Screen content protection.
import React from "react";
import { PrivacyScreen } from "@capacitor/privacy-screen";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PagePrivacyScreen: React.FC = () => {
  const log = useLogger();

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="green" onClick={async () => {
        try { log.info("PrivacyScreen", "enable", await PrivacyScreen.enable()); }
        catch (e) { log.error("PrivacyScreen", "enable", e); }
      }}>
        enable()
      </Button>
      <Button type="yellow" onClick={async () => {
        try { log.info("PrivacyScreen", "enable custom", await PrivacyScreen.enable({ android: { privacyModeOnActivityHidden: "dim" } })); }
        catch (e) { log.error("PrivacyScreen", "enable custom", e); }
      }}>
        enable custom
      </Button>
      <Button type="red" onClick={async () => {
        try { log.info("PrivacyScreen", "disable", await PrivacyScreen.disable()); }
        catch (e) { log.error("PrivacyScreen", "disable", e); }
      }}>
        disable()
      </Button>
      <Button type="neutral" onClick={async () => {
        try { log.info("PrivacyScreen", "isEnabled", await PrivacyScreen.isEnabled()); }
        catch (e) { log.error("PrivacyScreen", "isEnabled", e); }
      }}>
        isEnabled()
      </Button>
    </div>
  );
};
