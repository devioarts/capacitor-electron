# Power save blocker

Prevent the operating system from suspending the app, or from putting the display to sleep while a task is running.

This API is exposed through `window.Electron` and maps to Electron's `powerSaveBlocker`.

---

## Basic usage

```typescript
const id = await window.Electron.startPowerSaveBlocker('prevent-display-sleep');

// Keep the id so you can stop the blocker later.
await window.Electron.stopPowerSaveBlocker(id);
```

---

## Blocker types

| Type | Effect |
|---|---|
| `prevent-app-suspension` | Prevents the app from being suspended. |
| `prevent-display-sleep` | Prevents the display from sleeping. This has higher precedence than `prevent-app-suspension`. |

Use `prevent-display-sleep` for kiosk screens, dashboards, media playback, presentations, or visible long-running workflows.
Use `prevent-app-suspension` when the app needs to keep working but the display does not need to stay awake.

---

## Methods

### `startPowerSaveBlocker(type)`

Starts a power save blocker and returns its id.

```typescript
startPowerSaveBlocker(
  type: 'prevent-app-suspension' | 'prevent-display-sleep',
): Promise<number>
```

### `stopPowerSaveBlocker(id)`

Stops a previously started blocker. Returns `false` when the id is not active.

```typescript
stopPowerSaveBlocker(id: number): Promise<boolean>
```

### `isPowerSaveBlockerStarted(id)`

Checks whether a blocker id is currently active.

```typescript
isPowerSaveBlockerStarted(id: number): Promise<boolean>
```

---

## React example

```tsx
import { useEffect } from 'react';

export function PresentationMode({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    let blockerId: number | null = null;
    let disposed = false;

    window.Electron.startPowerSaveBlocker('prevent-display-sleep')
      .then((id) => {
        if (disposed) {
          void window.Electron.stopPowerSaveBlocker(id);
          return;
        }
        blockerId = id;
      });

    return () => {
      disposed = true;
      if (blockerId !== null) void window.Electron.stopPowerSaveBlocker(blockerId);
    };
  }, [enabled]);

  return null;
}
```

Always stop blockers when they are no longer needed. Leaving a display-sleep blocker active can drain battery quickly.
