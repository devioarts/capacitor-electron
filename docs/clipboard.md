# Clipboard

Electron implementation of `@capacitor/clipboard`.

```ts
import { Clipboard } from '@capacitor/clipboard';

await Clipboard.write({ string: 'Hello desktop' });
const { value, type } = await Clipboard.read();
```

## Methods

| Method | Notes |
|---|---|
| `write({ string })` | Writes plain text. |
| `write({ url })` | Writes the URL as text, matching Capacitor's clipboard contract. |
| `write({ image })` | Accepts a data URL and writes an image to the native clipboard. |
| `read()` | Returns `{ value, type }`; images are returned as PNG data URLs. |

`label` is accepted by the upstream Capacitor type but ignored on Electron because desktop clipboards do not have Android-style user-visible labels.
