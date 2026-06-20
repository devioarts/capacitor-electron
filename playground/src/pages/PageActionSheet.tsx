import React from "react";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageActionSheet: React.FC = () => {
  const log = useLogger();

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Na Electronu se ActionSheet zobrazuje jako nativni dialog s tlacitky.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="primary" onClick={async () => {
          try {
            const result = await ActionSheet.showActions({
              title: "Vyber akci",
              message: "Co chces udelat?",
              options: [
                { title: "Ulozit", style: ActionSheetButtonStyle.Default },
                { title: "Smazat", style: ActionSheetButtonStyle.Destructive },
                { title: "Zrusit", style: ActionSheetButtonStyle.Cancel },
              ],
            });
            log.info("ActionSheet", "showActions(default/destructive/cancel)", result);
          } catch (e) { log.error("ActionSheet", "showActions", e); }
        }}>
          default set
        </Button>
        <Button type="neutral" onClick={async () => {
          try {
            const result = await ActionSheet.showActions({
              title: "Sdilet soubor",
              options: [
                { title: "Kopirovat odkaz" },
                { title: "Otevrit v prohlizeci" },
                { title: "Exportovat jako PDF" },
                { title: "Zrusit", style: ActionSheetButtonStyle.Cancel },
              ],
            });
            log.info("ActionSheet", "showActions(multiple)", result);
          } catch (e) { log.error("ActionSheet", "showActions", e); }
        }}>
          multiple choices
        </Button>
        <Button type="neutral" onClick={async () => {
          try {
            const result = await ActionSheet.showActions({
              options: [
                { title: "Bez titulku" },
                { title: "Cancel", style: ActionSheetButtonStyle.Cancel },
              ],
            });
            log.info("ActionSheet", "showActions(no title)", result);
          } catch (e) { log.error("ActionSheet", "showActions(no title)", e); }
        }}>
          no title
        </Button>
      </div>
    </div>
  );
};
