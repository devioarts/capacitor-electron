import React from "react";

export type SupportLevel = "supported" | "partial" | "noop" | "unsupported";

export type SupportStatus = {
  name: string;
  level?: SupportLevel;
  note?: string;
};

type PlatformSupportProps = {
  title?: string;
  platforms: string[];
  os?: SupportStatus[];
  notes?: React.ReactNode;
};

const levelClasses: Record<SupportLevel, string> = {
  supported: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  partial: "bg-amber-50 text-amber-800 ring-amber-200",
  noop: "bg-slate-100 text-slate-600 ring-slate-200",
  unsupported: "bg-rose-50 text-rose-800 ring-rose-200",
};

export const PlatformSupport: React.FC<PlatformSupportProps> = ({
  title = "Supported platforms",
  platforms,
  os,
  notes,
}) => (
  <section className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => (
        <span key={platform} className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
          {platform}
        </span>
      ))}
    </div>
    {os && os.length > 0 && (
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Operating systems</p>
        <div className="flex flex-wrap gap-2">
          {os.map(({ name, level = "supported", note }) => (
            <span
              key={`${name}-${note ?? ""}`}
              title={note}
              className={[
                "rounded px-2 py-1 text-xs font-medium ring-1",
                levelClasses[level],
              ].join(" ")}
            >
              {name}
              {level !== "supported" && <span className="ml-1 opacity-75">({level})</span>}
            </span>
          ))}
        </div>
      </div>
    )}
    {notes && <div className="text-xs leading-relaxed text-slate-500">{notes}</div>}
  </section>
);
