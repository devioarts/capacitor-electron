# App

Built-in Electron implementation of `@capacitor/app`. No extra configuration required — install the Capacitor plugin and it works on Electron out of the box.

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

The URL is parsed from `process.argv` at startup. It is only available on the first call after launch.

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

Fires when the app is opened via a deep-link URL. Requires `deepLinkingScheme` to be configured — see [deep-linking.md](deep-linking.md).

```typescript
await App.addListener('appUrlOpen', ({ url }) => {
  console.log('Opened via', url);
});
```

This event uses the same infrastructure as `window.Electron.onDeepLink()`. Both can coexist.

### `backButton`

No-op on Electron — desktop apps have no hardware back button. The listener is accepted without error but never fires.

---

## Platform behaviour

`appStateChange`, `resume`, and `pause` are driven by the Electron `focus` and `blur` events on the main `BrowserWindow`. They share a single pair of window-level event handlers and are attached lazily (only when the first listener is added).

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| `backButton` event | No-op | No hardware back button on desktop |
| `getLaunchUrl()` persistence | First call only | `process.argv` is read once at startup |
| `minimizeApp()` in fullscreen | Exits fullscreen first | Matches the behaviour of `window.Electron.minimize()` |
