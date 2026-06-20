# InAppBrowser

Electron implementation of `@capacitor/inappbrowser`.

```bash
npm install @capacitor/inappbrowser
npx cap-electron sync
```

---

## Modes

### `openInExternalBrowser()`

Opens the URL in the user's default browser via Electron `shell.openExternal()`.

```ts
import { InAppBrowser } from '@capacitor/inappbrowser';

await InAppBrowser.openInExternalBrowser({ url: 'https://example.com' });
```

Only `http://` and `https://` URLs are accepted.

### `openInSystemBrowser()`

On mobile, Capacitor maps this to SafariViewController / Android Custom Tabs. Electron does not have that OS layer, so this method also uses `shell.openExternal()`.

The upstream `SystemBrowserOptions` object is accepted for API compatibility but ignored on Electron.

### `openInWebView()`

Opens the URL in an Electron-owned browser window. This mode supports close/load/navigation events and Electron-specific window/session options.

```ts
import { DefaultWebViewOptions, InAppBrowser } from '@capacitor/inappbrowser';

await InAppBrowser.openInWebView({
  url: 'https://example.com',
  options: {
    ...DefaultWebViewOptions,
    showToolbar: true,
    showURL: true,
    showNavigationButtons: true,
    electron: {
      window: {
        width: 1000,
        height: 720,
        title: 'Preview',
      },
      session: {
        partition: 'persist:inappbrowser',
      },
      navigation: {
        openExternalLinksInSystemBrowser: true,
      },
    },
  },
});
```

---

## WebView Options

Electron uses these upstream `WebViewOptions`:

| Option | Electron behavior |
|---|---|
| `showToolbar` | Shows/hides the Electron toolbar area |
| `showURL` | Shows/hides the current URL label |
| `closeButtonText` | Text for the close control |
| `toolbarPosition` | `TOP` or `BOTTOM` toolbar placement |
| `showNavigationButtons` | Shows back/forward/reload controls |
| `leftToRight` | Places navigation controls before close |
| `customWebViewUserAgent` | Sets the embedded page user agent |
| `clearCache` | Clears the selected Electron session cache before opening |
| `clearSessionCache` | Clears cookies/storage/cache before opening |

Mobile-only `android.*` and `iOS.*` options are accepted but ignored unless they have a direct Electron equivalent above.

---

## Electron Options

Add Electron-only options under `options.electron`. Mobile platforms ignore this unknown key at runtime.

```ts
electron: {
  window?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    x?: number;
    y?: number;
    center?: boolean;
    title?: string;
    alwaysOnTop?: boolean;
    resizable?: boolean;
    minimizable?: boolean;
    maximizable?: boolean;
    fullscreenable?: boolean;
    closable?: boolean;
    movable?: boolean;
    show?: boolean;
    frame?: boolean;
    autoHideMenuBar?: boolean;
    backgroundColor?: string;
    opacity?: number;
    titleBarStyle?: 'default' | 'hidden' | 'hiddenInset';
  };
  session?: {
    partition?: string;
    clearCache?: boolean;
    clearStorage?: boolean;
  };
  navigation?: {
    openExternalLinksInSystemBrowser?: boolean;
  };
}
```

`electron.window` follows the shape of Electron `BrowserWindowConstructorOptions`, but it is sanitized before use. Security-sensitive fields are ignored, including `webPreferences`, `preload`, `nodeIntegration`, `contextIsolation`, `sandbox`, `webSecurity`, `session`, and `partition`.

Use `electron.session.partition` for controlled session selection.

---

## TypeScript

If your renderer app wants typed `options.electron`, augment `@capacitor/inappbrowser`:

```ts
import type { ElectronInAppBrowserOptions } from '@devioarts/capacitor-electron';

declare module '@capacitor/inappbrowser' {
  interface WebViewOptions {
    electron?: ElectronInAppBrowserOptions;
  }
}
```

---

## Events

Events are emitted for `openInWebView()` only.

| Event | Payload | Electron source |
|---|---|---|
| `browserClosed` | none | Window `closed` |
| `browserPageLoaded` | none | Embedded page `did-finish-load` |
| `browserPageNavigationCompleted` | `{ url }` | Embedded page navigation |

`openInExternalBrowser()` and `openInSystemBrowser()` use `shell.openExternal()`, so Electron cannot observe page load or close events for them.
