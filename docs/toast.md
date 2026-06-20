# Toast

Built-in Electron implementation of `@capacitor/toast`. No extra configuration required — install the Capacitor plugin and it works on Electron out of the box.

Uses the Electron `Notification` API — silent, fire-and-forget, auto-dismissed after the specified duration.

Official reference: [Capacitor Toast API](https://capacitorjs.com/docs/apis/toast).

---

## Setup

```bash
npm install @capacitor/toast
npx cap-electron sync
```

---

## Basic usage

```typescript
import { Toast } from '@capacitor/toast';

await Toast.show({ text: 'File saved.' });

// Long duration (3.5 s)
await Toast.show({ text: 'Changes applied.', duration: 'long' });
```

---

## API reference

### `show(options)`

| Option     | Type     | Default   | Description |
|------------|----------|-----------|-------------|
| `text`     | `string` | required  | Message to display |
| `duration` | `string` | `'short'` | `'short'` (2 s) or `'long'` (3.5 s) |
| `position` | `string` | —         | `'top'`, `'center'`, or `'bottom'` — ignored on Electron |

The call resolves immediately after showing the notification. Auto-dismiss happens after the specified duration.

---

## Platform behaviour

Toasts are shown as OS notifications using Electron's `Notification` API:

- **Title** — empty (toasts have no title, unlike regular notifications)
- **Sound** — silent (`silent: true`)
- **Position** — controlled by the OS; the `position` option is ignored
- **Auto-dismiss** — a `setTimeout` closes the notification after 2 or 3.5 seconds. On macOS the OS may dismiss it earlier; on Windows the notification may remain in the Action Center after the auto-dismiss timeout.

Supported on macOS, Windows, and Linux when Electron notifications are available. See [platform-support.md](platform-support.md).

### macOS (unsigned builds)

On unsigned macOS apps, `Notification` may fail silently. The toast will not appear, but no error is thrown. Sign your app with an Apple Developer certificate to ensure notifications work in production.

### Headless / kiosk

When `Notification.isSupported()` returns `false`, `show()` is a no-op.

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| `position` | Ignored | OS controls notification placement — no Electron API to set it |
| Notification stays in Action Center (Windows) | Expected | OS behaviour; the auto-dismiss only hides the toast, not the Action Center entry |
| Guaranteed visibility (unsigned macOS) | Not guaranteed | macOS requires a signed app for `UNNotification` to work |
