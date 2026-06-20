import React, { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Input, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";

const PAGE_SIZES: Array<{ label: string; width: number; height: number }> = [
  { label: "A4",     width: 8.27,  height: 11.69 },
  { label: "Letter", width: 8.5,   height: 11.0  },
  { label: "Legal",  width: 8.5,   height: 14.0  },
  { label: "A3",     width: 11.69, height: 16.54 },
];

export const PageElectronPrint: React.FC = () => {
  const log = useLogger();
  const [pdfPath, setPdfPath] = useState("");
  const [landscape, setLandscape] = useState(false);
  const [printBackground, setPrintBackground] = useState(false);
  const [pageSize, setPageSize] = useState("A4");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const getPdfOptions = () => {
    const size = PAGE_SIZES.find((s) => s.label === pageSize) ?? PAGE_SIZES[0];
    return {
      landscape,
      printBackground,
      paperWidth: landscape ? size.height : size.width,
      paperHeight: landscape ? size.width : size.height,
    };
  };

  const handlePdfResult = (result: { path: string } | { data: string }) => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    if ("path" in result) {
      log.info("Print", "printToPDF", { path: result.path });
      setPdfUrl(null);
    } else {
      const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      log.info("Print", "printToPDF", { dataLength: result.data.length, blobUrl: url });
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Printers</p>
        <Button type="neutral" onClick={async () => {
          try { log.info("Print", "getPrinters", await window.Electron.print.getPrinters()); }
          catch (e) { log.error("Print", "getPrinters", e); }
        }}>
          getPrinters()
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Print page</p>
        <div className="flex flex-wrap gap-2">
          <Button type="yellow" onClick={async () => {
            try { log.info("Print", "print", await window.Electron.print.print({ silent: false })); }
            catch (e) { log.error("Print", "print", e); }
          }}>
            print()
          </Button>
          <Button type="yellow" onClick={async () => {
            try { log.info("Print", "print silent", await window.Electron.print.print({ silent: true })); }
            catch (e) { log.error("Print", "print silent", e); }
          }}>
            print silent
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">printToPDF()</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Label label="Save path (optional)">
            <Input value={pdfPath} onChange={(e) => setPdfPath(e.target.value)} placeholder="/absolute/path/page.pdf" />
          </Label>
          <Label label="Page size">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-full"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s.label} value={s.label}>{s.label}</option>
              ))}
            </select>
          </Label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={landscape} onChange={(e) => setLandscape(e.target.checked)} />
            landscape
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={printBackground} onChange={(e) => setPrintBackground(e.target.checked)} />
            printBackground
          </label>
        </div>
        <Button type="neutral" onClick={async () => {
          try {
            const result = await window.Electron.print.printToPDF({
              options: getPdfOptions(),
              path: pdfPath || undefined,
            });
            handlePdfResult(result);
          } catch (e) { log.error("Print", "printToPDF", e); }
        }}>
          printToPDF()
        </Button>
        {pdfUrl && (
          <div className="flex items-center gap-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
            <span className="text-emerald-700">PDF ready</span>
            <a
              href={pdfUrl}
              download="page.pdf"
              className="text-indigo-600 hover:underline font-medium"
            >
              Download PDF
            </a>
            <button
              className="ml-auto text-xs text-slate-400 hover:text-slate-600"
              onClick={() => { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }}
            >
              dismiss
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
