import React from "react";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/logger-context";

export const PageActionSheet: React.FC = () => {
  const log = useLogger();

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Electron renders ActionSheet as a native message box with indexed buttons.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="primary" onClick={async () => {
          try {
            const result = await ActionSheet.showActions({
              title: "Choose an action",
              message: "What would you like to do?",
              options: [
                { title: "Save", style: ActionSheetButtonStyle.Default },
                { title: "Delete", style: ActionSheetButtonStyle.Destructive },
                { title: "Cancel", style: ActionSheetButtonStyle.Cancel },
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
              title: "Share file",
              options: [
                { title: "Copy link" },
                { title: "Open in browser" },
                { title: "Export as PDF" },
                { title: "Cancel", style: ActionSheetButtonStyle.Cancel },
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
                { title: "No title" },
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
