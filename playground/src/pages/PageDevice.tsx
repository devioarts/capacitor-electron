import React from "react";
import { Device } from "@capacitor/device";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageDevice: React.FC = () => {
  const log = useLogger();

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={async () => {
        try { log.info("Device", "getInfo", await Device.getInfo()); }
        catch (e) { log.error("Device", "getInfo", e); }
      }}>
        getInfo()
      </Button>
      <Button type="neutral" onClick={async () => {
        try { log.info("Device", "getId", await Device.getId()); }
        catch (e) { log.error("Device", "getId", e); }
      }}>
        getId()
      </Button>
      <Button type="neutral" onClick={async () => {
        try { log.info("Device", "getLanguageCode", await Device.getLanguageCode()); }
        catch (e) { log.error("Device", "getLanguageCode", e); }
      }}>
        getLanguageCode()
      </Button>
      <Button type="neutral" onClick={async () => {
        try { log.info("Device", "getLanguageTag", await Device.getLanguageTag()); }
        catch (e) { log.error("Device", "getLanguageTag", e); }
      }}>
        getLanguageTag()
      </Button>
      <Button type="neutral" onClick={async () => {
        try { log.info("Device", "getBatteryInfo", await Device.getBatteryInfo()); }
        catch (e) { log.error("Device", "getBatteryInfo", e); }
      }}>
        getBatteryInfo()
      </Button>
    </div>
  );
};
