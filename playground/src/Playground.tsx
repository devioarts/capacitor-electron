// Tabbed playground surface that renders every Capacitor and Electron demo page.
import React, { useState, useRef, useEffect } from "react";
// import { MyPlugin } from "@devioarts/capacitor-PLUGIN_NAME";
import { PlatformSupport } from "./components/PlatformSupport.tsx";
import { TabButton } from "./components/TabButton.tsx";
import { tabGroups, tabs, type TabItem } from "./tabs.tsx";

export const Playground: React.FC = () => {
  const [active, setActive] = useState<string>("electron-info");
  const activeTab = tabs.find((tab) => tab.id === active);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200">
        {tabGroups.map((group) => (
          <TabRow
            key={group.id}
            label={group.label}
            tabs={group.tabs}
            active={active}
            onSelect={setActive}
          />
        ))}
      </div>
      <div className="flex-1 overflow-auto px-4 py-6 space-y-4">
        {activeTab && <PlatformSupport platforms={activeTab.platforms} os={activeTab.os} notes={activeTab.supportNotes} />}
        {activeTab?.page}
      </div>
    </div>
  );
};

type TabRowProps = {
  label: string;
  tabs: TabItem[];
  active: string;
  onSelect: (tabId: string) => void;
};

const TabRow: React.FC<TabRowProps> = ({ label, tabs, active, onSelect }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const checkFades = () => {
    const el = barRef.current;
    if (!el) return;
    setFadeLeft(el.scrollLeft > 0);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkFades();
    const el = barRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkFades);
    const ro = new ResizeObserver(checkFades);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkFades); ro.disconnect(); };
  }, []);

  return (
    <div className="relative flex min-h-10 border-b border-slate-200 last:border-b-0">
      <div className="w-24 shrink-0 border-r border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        ref={barRef}
        className="flex min-w-0 flex-1 items-center overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {tabs.map((tab) => (
          <TabButton key={tab.id} tabId={tab.id} active={active} onClick={() => onSelect(tab.id)}>
            {tab.label}
          </TabButton>
        ))}
      </div>
      {fadeLeft && (
        <div className="absolute left-24 top-0 bottom-0 w-10 bg-gradient-to-r from-slate-50 to-transparent pointer-events-none" />
      )}
      {fadeRight && (
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
      )}
    </div>
  );
};
