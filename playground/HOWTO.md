# Capacitor Plugin Playground — AI Usage Guide

This is a web-based playground for testing and demonstrating Capacitor plugins. It runs as a Vite + React app and can be deployed to iOS/Android via Capacitor or used standalone in a browser.

---

## Setup

1. Replace every occurrence of `PLUGIN_NAME` with the actual plugin name (package.json, App.tsx title, capacitor.config.ts, etc.).
2. Run `npm install` and `npm run dev`.

---

## Project Structure

```
src/
├── App.tsx              # Root layout: header, main area, logger panel
├── Playground.tsx       # Tab bar + scrollable content area
├── tabs.tsx             # Tab registry — add new tabs here
├── index.css            # Tailwind v4 import only
├── components/
│   ├── Button.tsx       # Styled button (5 color variants)
│   ├── Input.tsx        # Input, TextArea, Label components
│   ├── Logger.tsx       # Logger context, provider, viewer panel
│   └── TabButton.tsx    # Individual tab button
├── helpers/             # Utility functions, formatters, constants, etc.
└── pages/
    ├── PageHome.tsx      # Primary plugin methods
    └── PageShowcase.tsx  # Full component showcase (delete or keep)
```

- If a page needs UI that doesn't exist in the components above, create a new file in `src/components/` and import it from the page. Do not add one-off UI directly into page files.
- If a page needs helper logic (formatters, converters, constants, mock data, etc.), put it in `src/helpers/` and import from there. Keep page and component files focused on rendering only.

---

## Adding a New Tab / Page

**Step 1** — Create the page file:

```tsx
// src/pages/PageMyFeature.tsx
import React from "react";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/Logger.tsx";

export const PageMyFeature: React.FC = () => {
  const log = useLogger();

  return (
    <div className="space-y-3">
      <Button type="primary" onClick={() => log.info("myFeature", "called")}>
        myMethod()
      </Button>
    </div>
  );
};
```

**Step 2** — Register it in `src/tabs.tsx`:

```ts
import { PageMyFeature } from "./pages/PageMyFeature.tsx";

export const tabs: TabItem[] = [
  // ...existing tabs
  {
    id: "my-feature",
    label: "My Feature",
    page: <PageMyFeature />,
  },
];
```

That's it — the tab appears automatically in the bar.

---

## Components

### Button

```tsx
import { Button } from "../components/Button.tsx";

<Button type="primary"  onClick={...}>Label</Button>
<Button type="green"    onClick={...}>Label</Button>
<Button type="red"      onClick={...}>Label</Button>
<Button type="neutral"  onClick={...}>Label</Button>
<Button type="yellow"   onClick={...}>Label</Button>
<Button type="primary"  disabled>Disabled</Button>
```

### Input / TextArea / Label

```tsx
import { Input, TextArea, Label } from "../components/Input.tsx";

<Label label="Field name">
  <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="…" />
</Label>

<Label label="Multiline">
  <TextArea value={val} onChange={(e) => setVal(e.target.value)} rows={4} />
</Label>
```

---

## Logger

The logger is available on every page via `useLogger()`.

```tsx
const log = useLogger();

log.info("scope",  "message", optionalData);
log.warn("scope",  "message", optionalData);
log.error("scope", "message", optionalData);
```

- `scope` — short string identifying the source (e.g. `"plugin"`, `"camera"`)
- `optionalData` — any value: object, array, string, number, Uint8Array, etc.

The logger panel at the bottom of the screen shows all entries. It can be:
- Collapsed / expanded with the chevron button
- Switched to the right side panel with the layout icon
- Resized with the 3 size buttons (S / M / L)
- Filtered by sink: `panel` | `console` | `both` (select in the top header)

---

## Calling Plugin Methods

Import the plugin directly in the page file where it is used — never in `Playground.tsx` or `App.tsx`.

```tsx
// src/pages/PageHome.tsx
import { MyPlugin } from "@devioarts/capacitor-PLUGIN_NAME";

const [result, setResult] = useState<string | null>(null);

const callMethod = async () => {
  try {
    const res = await MyPlugin.someMethod({ option: "value" });
    log.info("plugin", "someMethod result", res);
    setResult(JSON.stringify(res));
  } catch (e) {
    log.error("plugin", "someMethod failed", e);
  }
};

// In JSX:
<Button type="primary" onClick={callMethod}>someMethod()</Button>
{result && <pre className="text-xs font-mono bg-slate-50 p-2 rounded">{result}</pre>}
```

---

## Layout Notes

- The app is a full-screen flex column: `Header → Tab bar → Content → Logger`
- Tab bar is always visible and does not scroll with the content
- Content area scrolls independently
- Logger is a separate panel outside the content scroll area
- The tab bar hides the scrollbar but shows a gradient fade on either edge when more tabs exist off-screen

---

## Build & Deploy

```bash
npm run dev           # local dev server
npm run build         # production build
npm run build:copy    # build + cap copy (sync to native)
npm run cap:sync      # capacitor sync
npm run open-ios      # open in Xcode
npm run open-android  # open in Android Studio
```
