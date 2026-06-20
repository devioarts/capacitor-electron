# Privacy Screen

Electron implementation of `@capacitor/privacy-screen`.

Official reference: [Capacitor Privacy Screen API](https://capacitorjs.com/docs/apis/privacy-screen).

```ts
import { PrivacyScreen } from '@capacitor/privacy-screen';

await PrivacyScreen.enable();
const { enabled } = await PrivacyScreen.isEnabled();
await PrivacyScreen.disable();
```

## Desktop behavior

Electron maps this to `BrowserWindow.setContentProtection(true)` for every open window.

This is a useful mitigation but not a universal guarantee:

- support depends on the operating system and window manager,
- some screen capture tools may still see content,
- Electron cannot exactly reproduce Android `FLAG_SECURE` or iOS app-switcher snapshots.

Use it for sensitive desktop screens, but keep server-side authorization and data minimization in place.

Supported on macOS, Windows, and Linux with OS/window-manager limitations. See [platform-support.md](platform-support.md).
