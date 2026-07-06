import React from "react";

type AutomatedTestNoteProps = {
  items: string[];
};

export const AutomatedTestNote: React.FC<AutomatedTestNoteProps> = ({ items }) => (
  <section className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-900">
    <p className="font-semibold uppercase tracking-wide text-indigo-700">Automated test coverage</p>
    <p className="mt-1">
      Playwright Electron e2e covers: {items.join(", ")}.
    </p>
  </section>
);
