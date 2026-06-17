# Device

Electron implementation of `@capacitor/device`.

```ts
import { Device } from '@capacitor/device';

const info = await Device.getInfo();
const id = await Device.getId();
```

## Methods

| Method | Notes |
|---|---|
| `getId()` | Returns a per-install UUID stored under Electron `userData`. |
| `getInfo()` | Returns hostname, OS, architecture, Chrome/WebView version, and process memory usage. |
| `getBatteryInfo()` | Returns an empty object when Electron cannot provide battery data. |
| `getLanguageCode()` | Uses `app.getLocale()` and returns the language part. |
| `getLanguageTag()` | Uses `app.getLocale()` or the runtime locale fallback. |

`platform` is reported as `'electron'` so desktop code can distinguish it from mobile and web.
