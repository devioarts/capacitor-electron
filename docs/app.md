# App

Built-in Electron implementation of `@capacitor/app`. No extra configuration required — install the Capacitor plugin and it works on Electron out of the box.

Official reference: [Capacitor App API](https://capacitorjs.com/docs/apis/app).

---

## Setup

```bash
npm install @capacitor/app
npx cap-electron sync
```

---

## Basic usage

```typescript
import { App } from '@capacitor/app';

const info = await App.getInfo();
console.log(info.name, info.version);

App.addListener('appStateChange', ({ isActive }) => {
  console.log('App is', isActive ? 'focused' : 'blurred');
});
```

---

## Methods

### `getInfo()`

Returns basic information about the app.

```typescript
const { id, name, build, version } = await App.getInfo();
```

| Field     | Source |
|-----------|--------|
| `id`      | `appId` from `capacitor.config.json`, falls back to `app.getName()` |
| `name`    | `app.getName()` |
| `build`   | `app.getVersion()` |
| `version` | `app.getVersion()` |

### `getState()`

Returns whether the app window is currently focused.

```typescript
const { isActive } = await App.getState();
```

`isActive` is `true` when the main window is visible, not minimized, and focused.

### `exitApp()`

Quits the application.

```typescript
await App.exitApp();
```

### `minimizeApp()`

Minimizes the main window. This is an Android-only method in the Capacitor spec, but it is meaningfully mapped to `win.minimize()` on Electron.

```typescript
await App.minimizeApp();
```

### `getLaunchUrl()`

Returns the deep-link URL that was used to launch the app (if any). Returns `null` when the app was opened normally.

```typescript
const result = await App.getLaunchUrl();
if (result) console.log('Launched via', result.url);
```

The startup URL is stored once and consumed by the first `getLaunchUrl()` call. Subsequent calls return `null` unless the app was launched again.

### `getAppLanguage()`

Returns the current app locale language code from Electron `app.getLocale()`.

```typescript
const { value } = await App.getAppLanguage();
```

### `toggleBackButtonHandler(options)`

No-op on Electron. This is an Android-only Capacitor method; it is accepted for API compatibility.

---

## Events

### `appStateChange`

Fires when the main window gains or loses focus.

```typescript
const handle = await App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) console.log('Window focused');
  else console.log('Window blurred');
});

// Later:
handle.remove();
```

### `resume`

Fires when the main window gains focus. Fires at the same time as `appStateChange` with `isActive: true`.

```typescript
await App.addListener('resume', () => {
  console.log('App resumed');
});
```

### `pause`

Fires when the main window loses focus. Fires at the same time as `appStateChange` with `isActive: false`.

```typescript
await App.addListener('pause', () => {
  console.log('App paused');
});
```

### `appUrlOpen`

Fires when the app is opened via a deep-link URL. Requires `app.deepLinkingScheme` to be configured — see [deep-linking.md](deep-linking.md).

```typescript
await App.addListener('appUrlOpen', ({ url }) => {
  console.log('Opened via', url);
});
```

This event uses the same infrastructure as `window.Electron.onDeepLink()`. Both can coexist.

### `backButton`

No-op on Electron — desktop apps have no hardware back button. The listener is accepted without error but never fires.

### `appRestoredResult`

No-op on Electron — Android activity result restoration has no desktop equivalent. The listener is accepted without error but never fires.

---

## Platform behaviour

`appStateChange`, `resume`, and `pause` are driven by the Electron `focus` and `blur` events on the main `BrowserWindow`. They share a single pair of window-level event handlers and are attached lazily (only when the first listener is added).

| Feature | macOS | Windows | Linux |
|---|---:|---:|---:|
| `getInfo()`, `getState()`, `exitApp()`, `minimizeApp()`, `getAppLanguage()` | Yes | Yes | Yes |
| `getLaunchUrl()` | Yes | Yes | Partial |
| `appUrlOpen` | Yes | Yes | Partial |
| `toggleBackButtonHandler()`, `backButton`, `appRestoredResult` | No-op | No-op | No-op |

Linux cold-start URL extraction is not implemented by the built-in helper. Running-instance Linux links can arrive through Electron's `second-instance` event when the desktop entry launches the app with the URL argument. See [deep-linking.md](deep-linking.md) and [platform-support.md](platform-support.md).

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| `backButton` event | No-op | No hardware back button on desktop |
| `appRestoredResult` event | No-op | Android activity result restoration has no desktop equivalent |
| `getLaunchUrl()` persistence | Startup URL only | The launch URL is consumed by the first `getLaunchUrl()` call; subsequent deep links arrive via `appUrlOpen` |
| `minimizeApp()` in fullscreen | Exits fullscreen first | Matches the behaviour of `window.Electron.minimize()` |
