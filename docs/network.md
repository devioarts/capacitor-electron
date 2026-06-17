# Network

Electron implementation of `@capacitor/network`.

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
| `connected` | Based on Chromium's `net.isOnline()` plus a short reachability probe. |
| `connectionType` | `'none'` when offline, otherwise `'unknown'`. Electron cannot reliably classify wifi vs cellular on desktop. |

Listeners poll periodically while at least one renderer listener is active. The polling stops when listeners are removed.
