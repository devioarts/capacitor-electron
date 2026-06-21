// Playground page for exercising Capacitor Dialog alert, confirm, and prompt behavior.
import React, { useState } from "react";
import { Dialog } from "@capacitor/dialog";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

export const PageDialog: React.FC = () => {
  const log = useLogger();

  const [alertTitle, setAlertTitle]   = useState("Notice");
  const [alertMsg, setAlertMsg]       = useState("Hello from Electron!");
  const [alertBtn, setAlertBtn]       = useState("OK");

  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMsg, setConfirmMsg]     = useState("Are you sure?");
  const [confirmOk, setConfirmOk]       = useState("Yes");
  const [confirmCancel, setConfirmCancel] = useState("Cancel");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">alert()</p>
        <div className="flex flex-wrap gap-2">
          <Label label="Title">
            <Input value={alertTitle} onChange={(e) => setAlertTitle(e.target.value)} />
          </Label>
          <Label label="Message">
            <Input value={alertMsg} onChange={(e) => setAlertMsg(e.target.value)} />
          </Label>
          <Label label="Button">
            <Input value={alertBtn} onChange={(e) => setAlertBtn(e.target.value)} />
          </Label>
        </div>
        <Button type="primary" onClick={async () => {
          try {
            await Dialog.alert({ title: alertTitle, message: alertMsg, buttonTitle: alertBtn });
            log.info("Dialog", "alert", "dismissed");
          } catch (e) { log.error("Dialog", "alert", e); }
        }}>
          alert()
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">confirm()</p>
        <div className="flex flex-wrap gap-2">
          <Label label="Title">
            <Input value={confirmTitle} onChange={(e) => setConfirmTitle(e.target.value)} />
          </Label>
          <Label label="Message">
            <Input value={confirmMsg} onChange={(e) => setConfirmMsg(e.target.value)} />
          </Label>
          <Label label="OK button">
            <Input value={confirmOk} onChange={(e) => setConfirmOk(e.target.value)} />
          </Label>
          <Label label="Cancel button">
            <Input value={confirmCancel} onChange={(e) => setConfirmCancel(e.target.value)} />
          </Label>
        </div>
        <Button type="primary" onClick={async () => {
          try {
            const result = await Dialog.confirm({
              title: confirmTitle,
              message: confirmMsg,
              okButtonTitle: confirmOk,
              cancelButtonTitle: confirmCancel,
            });
            log.info("Dialog", "confirm", result);
          } catch (e) { log.error("Dialog", "confirm", e); }
        }}>
          confirm()
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">
          prompt() returns <code>{"{ value: '', cancelled: true }"}</code> on Electron.
        </p>
        <Button type="neutral" onClick={async () => {
          try {
            const result = await Dialog.prompt({ title: "Enter a value", message: "This dialog is not supported on Electron." });
            log.info("Dialog", "prompt", result);
          } catch (e) { log.error("Dialog", "prompt", e); }
        }}>
          prompt()
        </Button>
      </section>
    </div>
  );
};
