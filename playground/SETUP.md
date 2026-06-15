# Playground Setup Instructions for AI

Replace this playground template for a specific Capacitor plugin by following the steps below exactly.

---

## 1. Replace PLUGIN_NAME

Replace the string `PLUGIN_NAME` in the following files:

| File | What to change |
|---|---|
| `package.json` | `name`, `description`, `appId`, `productName` |
| `capacitor.config.ts` | `appId`, `appName` |
| `src/App.tsx` | `<Header title="PLUGIN_NAME — Playground" />` |

---

## 2. Install the plugin package

Add the plugin import to `src/pages/PageHome.tsx`:

```tsx
import { PluginName } from "@devioarts/capacitor-PLUGIN_NAME";
```

Do not import the plugin anywhere else (not in `App.tsx`, `Playground.tsx`, or `tabs.tsx`).

---

## 3. Implement PageHome

`src/pages/PageHome.tsx` is the main page for plugin method calls. Add one `<Button>` per plugin method. Each button should call the method and log the result:

```tsx
import React from "react";
import { PluginName } from "@devioarts/capacitor-PLUGIN_NAME";
import { Button } from "../components/Button.tsx";
import { useLogger } from "../components/Logger.tsx";

export const PageHome: React.FC = () => {
  const log = useLogger();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="primary" onClick={async () => {
          try {
            const result = await PluginName.someMethod();
            log.info("plugin", "someMethod", result);
          } catch (e) {
            log.error("plugin", "someMethod", e);
          }
        }}>
          someMethod()
        </Button>
      </div>
    </div>
  );
};
```

---

## 4. Add more tabs if needed

For plugins with many methods, split them across multiple pages. Add each page to `src/tabs.tsx`:

```tsx
import { PageMyFeature } from "./pages/PageMyFeature.tsx";

export const tabs: TabItem[] = [
  { id: 'home',       label: 'Home',       page: <PageHome /> },
  { id: 'my-feature', label: 'My Feature', page: <PageMyFeature /> },
];
```

---

## 5. Remove PageShowcase (optional)

If the showcase page is not needed, remove it:

1. Delete `src/pages/PageShowcase.tsx`
2. Remove its import and entry from `src/tabs.tsx`

---

## Rules

- Plugin imports belong only in page files (`src/pages/`)
- New UI components go in `src/components/`
- Helper functions, formatters, constants go in `src/helpers/`
- Do not modify `App.tsx`, `Playground.tsx`, `Logger.tsx`, or `TabButton.tsx`
- Run `npm run build` after changes to verify no TypeScript errors
