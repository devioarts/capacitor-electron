# Network

Electron implementation of `@capacitor/network`.

Official reference: [Capacitor Network API](https://capacitorjs.com/docs/apis/network).

```ts
import { Network } from '@capacitor/network';

const status = await Network.getStatus();
const handle = await Network.addListener('networkStatusChange', status => {
  console.log(status);
});
```

## Behavior

`getStatus()` returns Capacitor-compatible `{ connected, connectionType }`.

| Field | Electron behavior |
|---|---|
| `connected` | Based on Chromium's `net.isOnline()`. No external HTTP probe is performed. |
| `connectionType` | `'none'` when offline, otherwise `'unknown'`. Electron cannot reliably classify wifi vs cellular on desktop. |

Listeners poll `net.isOnline()` every 10 seconds while at least one renderer listener is active. The polling stops when listeners are removed, so no background timer runs unless app code has subscribed to `networkStatusChange`.

This is intentionally implemented in the main process with Electron's `net.isOnline()` API. Electron does not expose a main-process `app.on('online')` / `app.on('offline')` event equivalent; renderer `online` / `offline` events can be added in application code if an app needs lower-latency UI hints.

Supported on macOS, Windows, and Linux. See [platform-support.md](platform-support.md).
