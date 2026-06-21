# Electron plugin guide

How to write a Capacitor plugin that runs on Electron.

---

## Plugin structure

An Electron plugin lives in two places:

| File | Purpose |
|---|---|
| `electron/src/user/plugins-main-user.ts` | Main process — registers IPC handlers |
| `electron/src/user/plugins-preload-user.ts` | Preload — declares which methods and events the plugin exposes |

---

## Registering methods

### 1. Declare the plugin in `plugins-preload-user.ts`

```typescript
export const pluginsUser = {
  MyPlugin: {
    methods: ['getData', 'setConfig'] as const,
  },
} satisfies Record<string, { methods: readonly string[]; events?: readonly string[] }>;
```

### 2. Implement handlers in `plugins-main-user.ts`

```typescript
import { registerPlugin, type AnyRecord } from '../system/shared/functions';

class MyPlugin {
  async getData(opts: { key: string }) {
    return { value: 'hello' };
  }

  async setConfig(opts: { enabled: boolean }) {
    return { success: true };
  }
}

registerPlugin('MyPlugin', new MyPlugin() as unknown as AnyRecord, ['getData', 'setConfig']);
```

### 3. Call from the renderer

Use the Capacitor `Plugins` object (requires `@capacitor/core`):

```typescript
import { Plugins } from '@capacitor/core';

const result = await (Plugins as any).MyPlugin.getData({ key: 'foo' });
```

Or call the underlying IPC bridge directly (no import needed):

```typescript
const result = await window.Capacitor.nativePromise('MyPlugin', 'getData', { key: 'foo' });
```

---

## Adding events

Events flow from the **main process → renderer**. Use them for hardware callbacks, file-system watches, timers, or anything else that originates outside a direct renderer call.

### 1. Declare events in `plugins-preload-user.ts`

```typescript
export const pluginsUser = {
  MyPlugin: {
    methods: ['getData'] as const,
    events: ['dataReceived', 'statusChanged'] as const,
  },
};
```

This causes the preload to expose `addListener`, `removeListener`, and `removeAllListeners` on the plugin bridge automatically.

### 2. Emit events from `plugins-main-user.ts`

```typescript
import { registerPlugin, emitPluginEvent, type AnyRecord } from '../system/shared/functions';

class MyPlugin {
  async getData() { /* ... */ }
}

registerPlugin('MyPlugin', new MyPlugin() as unknown as AnyRecord, ['getData']);

// Emit whenever something happens — from anywhere in the main process:
setInterval(() => {
  emitPluginEvent('MyPlugin', 'dataReceived', { value: Date.now() });
}, 1000);
```

`emitPluginEvent` sends to all open, non-destroyed windows. It is safe to call even before a window exists (the call is a no-op in that case).

### 3. Listen in the renderer

```typescript
import { Plugins } from '@capacitor/core';

const handle = await (Plugins as any).MyPlugin.addListener(
  'dataReceived',
  (data: { value: number }) => console.log(data.value),
);

// Later:
handle.remove();
```

---

## Lazy event sources (onAdd / onRemove hooks)

If starting the event source is expensive (hardware sensor, WebSocket, file watcher), use the `events` parameter of `registerPlugin` to start and stop it only when the renderer is actually listening.

```typescript
import { registerPlugin, emitPluginEvent, type AnyRecord } from '../system/shared/functions';

class TemperatureSensor {
  async getUnit() { return { unit: 'celsius' }; }
}

let timer: ReturnType<typeof setInterval> | null = null;

registerPlugin(
  'TemperatureSensor',
  new TemperatureSensor() as unknown as AnyRecord,
  ['getUnit'],
  {
    temperatureChanged: {
      onAdd() {
        // First renderer listener attached — start the source
        timer = setInterval(() => {
          emitPluginEvent('TemperatureSensor', 'temperatureChanged', { temp: 22.5 });
        }, 500);
      },
      onRemove() {
        // Last renderer listener removed — stop the source
        if (timer) { clearInterval(timer); timer = null; }
      },
    },
  },
);
```

`onAdd` fires when the **first** listener for a given event type is added in the renderer.
`onRemove` fires when the **last** listener for that event type is removed.
Both hooks are optional — omit either if you don't need lifecycle control.

---

## Reading capacitor.config in your plugin

Some plugins need their own configuration block from `capacitor.config` — for example a SQLite
plugin that needs to know whether encryption is enabled, or a push-notification plugin that reads
a server URL.

`cap-electron sync` copies only a fixed set of top-level keys plus `plugins.Electron` into
`electron/capacitor.config.json`. All other sections are stripped. Without `configSections`,
your plugin's configuration block would be absent from the file your main-process code reads.

### Declaring required config sections

In the plugin's `plugin-settings.ts` (the descriptor read by `cap-electron sync`), add a
`configSections` array with the names of the `plugins.*` keys your plugin reads:

```typescript
import type { PluginSettings } from '@devioarts/capacitor-electron';

export const pluginSettings: PluginSettings = {
  pluginClass: 'CapacitorSQLite',
  pluginMethods: ['open', 'query', 'close'],

  // cap-electron sync will copy plugins.CapacitorSQLite from capacitor.config
  // into electron/capacitor.config.json automatically.
  configSections: ['CapacitorSQLite'],
};
```

For auto-registered npm plugins, `cap-electron sync` imports `{ pluginClass }`
from `${packageName}/electron` and registers plugins after `app.whenReady()`.
Legacy `imports` and `beforeRegister` settings are ignored.

The app developer configures the plugin in their `capacitor.config.ts` as usual:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'My App',
  plugins: {
    CapacitorSQLite: {
      electronIsEncryption: false,
      electronSaveDatabasesFrom: 'userData',
    },
  },
};
```

After `cap-electron sync`, `electron/capacitor.config.json` will include the section:

```json
{
  "appId": "com.example.app",
  "appName": "My App",
  "plugins": {
    "Electron": { "..." : "..." },
    "CapacitorSQLite": {
      "electronIsEncryption": false,
      "electronSaveDatabasesFrom": "userData"
    }
  }
}
```

No extra setup is needed on the app developer's side — sections from all installed plugins are
merged automatically. If a declared section is missing from the project's `capacitor.config`,
`cap-electron sync` prints a warning so the developer can catch the misconfiguration early.

---

## IPC channel reference

The following naming convention is used internally. You do not need to use these directly — `registerPlugin` and `emitPluginEvent` handle them for you.

| Direction | Channel | When |
|---|---|---|
| Renderer → Main | `PluginName-methodName` | Method call via `invoke` |
| Renderer → Main | `event-add-PluginName` | First listener added for an event type |
| Renderer → Main | `event-remove-PluginName-eventType` | Last listener removed for an event type |
| Main → Renderer | `event-PluginName-eventType` | Plugin emits an event |
