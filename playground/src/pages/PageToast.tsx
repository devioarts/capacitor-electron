import React, { useState } from "react";
import { Toast } from "@capacitor/toast";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/Logger.tsx";

export const PageToast: React.FC = () => {
  const log = useLogger();
  const [toastText, setToastText] = useState("Ahoj z Electronu!");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Toast.show()</p>
        <p className="text-xs text-slate-500">
          Na Electronu se zobrazí jako systémové oznámení (silent). Na macOS může selhat u unsigned buildů.
        </p>
        <Label label="Text">
          <Input value={toastText} onChange={(e) => setToastText(e.target.value)} />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              await Toast.show({ text: toastText, duration: "short" });
              log.info("Toast", "show(short)", toastText);
            } catch (e) { log.error("Toast", "show", e); }
          }}>
            show(short — 2s)
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              await Toast.show({ text: toastText, duration: "long" });
              log.info("Toast", "show(long)", toastText);
            } catch (e) { log.error("Toast", "show", e); }
          }}>
            show(long — 3.5s)
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">ActionSheet.showActions()</p>
        <p className="text-xs text-slate-500">
          Na Electronu se zobrazí jako nativní dialog s tlačítky. DESTRUCTIVE = prefix ⚠.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              const result = await ActionSheet.showActions({
                title: "Vyber akci",
                message: "Co chceš udělat?",
                options: [
                  { title: "Uložit", style: ActionSheetButtonStyle.Default },
                  { title: "Smazat", style: ActionSheetButtonStyle.Destructive },
                  { title: "Zrušit", style: ActionSheetButtonStyle.Cancel },
                ],
              });
              log.info("ActionSheet", "showActions", { index: result.index });
            } catch (e) { log.error("ActionSheet", "showActions", e); }
          }}>
            showActions() — 3 možnosti
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const result = await ActionSheet.showActions({
                title: "Sdílet soubor",
                options: [
                  { title: "Kopírovat odkaz" },
                  { title: "Otevřít v prohlížeči" },
                  { title: "Exportovat jako PDF" },
                  { title: "Zrušit", style: ActionSheetButtonStyle.Cancel },
                ],
              });
              log.info("ActionSheet", "showActions", { index: result.index });
            } catch (e) { log.error("ActionSheet", "showActions", e); }
          }}>
            showActions() — 4 možnosti
          </Button>
        </div>
      </section>
    </div>
  );
};
