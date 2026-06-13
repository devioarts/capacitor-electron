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
import { registerPlugin } from './src';

class MyPlugin {
  async getData(opts: { key: string }) {
    return { value: 'hello' };
  }

  async setConfig(opts: { enabled: boolean }) {
    return { success: true };
  }
}

registerPlugin('MyPlugin', new MyPlugin(), ['getData', 'setConfig']);
```

### 3. Call from the renderer

```typescript
const result = await CapacitorCustomPlatform.plugins.MyPlugin.getData({ key: 'foo' });
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
import { registerPlugin, emitPluginEvent } from './src';

class MyPlugin {
  async getData() { /* ... */ }
}

registerPlugin('MyPlugin', new MyPlugin(), ['getData']);

// Emit whenever something happens — from anywhere in the main process:
setInterval(() => {
  emitPluginEvent('MyPlugin', 'dataReceived', { value: Date.now() });
}, 1000);
```

`emitPluginEvent` sends to all open, non-destroyed windows. It is safe to call even before a window exists (the call is a no-op in that case).

### 3. Listen in the renderer

```typescript
const listenerId = await CapacitorCustomPlatform.plugins.MyPlugin.addListener(
  'dataReceived',
  (data) => console.log(data.value),
);

// Later:
await CapacitorCustomPlatform.plugins.MyPlugin.removeListener(listenerId);
```

---

## Lazy event sources (onAdd / onRemove hooks)

If starting the event source is expensive (hardware sensor, WebSocket, file watcher), use the `events` parameter of `registerPlugin` to start and stop it only when the renderer is actually listening.

```typescript
import { registerPlugin, emitPluginEvent } from './src';

class TemperatureSensor {
  async getUnit() { return { unit: 'celsius' }; }
}

let timer: ReturnType<typeof setInterval> | null = null;

registerPlugin(
  'TemperatureSensor',
  new TemperatureSensor(),
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

## IPC channel reference

The following naming convention is used internally. You do not need to use these directly — `registerPlugin` and `emitPluginEvent` handle them for you.

| Direction | Channel | When |
|---|---|---|
| Renderer → Main | `PluginName-methodName` | Method call via `invoke` |
| Renderer → Main | `event-add-PluginName` | First listener added for an event type |
| Renderer → Main | `event-remove-PluginName-eventType` | Last listener removed for an event type |
| Main → Renderer | `event-PluginName-eventType` | Plugin emits an event |
