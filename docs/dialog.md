# Dialog

Built-in Electron implementation of `@capacitor/dialog`. No extra configuration required — install the Capacitor plugin and it works on Electron out of the box.

`alert` and `confirm` use `dialog.showMessageBox` — native OS dialogs. `prompt` is not supported and always returns a cancelled response.

Official reference: [Capacitor Dialog API](https://capacitorjs.com/docs/apis/dialog).

---

## Setup

```bash
npm install @capacitor/dialog
npx cap-electron sync
```

---

## Basic usage

```typescript
import { Dialog } from '@capacitor/dialog';

// Alert
await Dialog.alert({ title: 'Notice', message: 'Operation complete.' });

// Confirm
const { value } = await Dialog.confirm({
  title: 'Delete',
  message: 'Are you sure?',
  okButtonTitle: 'Delete',
  cancelButtonTitle: 'Cancel',
});
if (value) console.log('Confirmed');

// Prompt — not supported, always cancelled
const { value: text, cancelled } = await Dialog.prompt({
  title: 'Input',
  message: 'Enter a value:',
});
// cancelled === true, text === ''
```

---

## API reference

### `alert(options)`

Shows a native informational dialog with a single dismiss button.

| Option        | Type     | Default | Description |
|---------------|----------|---------|-------------|
| `title`       | `string` | `''`    | Dialog title |
| `message`     | `string` | `''`    | Dialog body text |
| `buttonTitle` | `string` | `'OK'`  | Label of the dismiss button |

Returns `Promise<void>` — resolves when the user dismisses the dialog.

### `confirm(options)`

Shows a native question dialog with an OK and a Cancel button.

| Option               | Type     | Default    | Description |
|----------------------|----------|------------|-------------|
| `title`              | `string` | `''`       | Dialog title |
| `message`            | `string` | `''`       | Dialog body text |
| `okButtonTitle`      | `string` | `'OK'`     | Label of the confirm button |
| `cancelButtonTitle`  | `string` | `'Cancel'` | Label of the cancel button |

Returns `{ value: boolean }` — `true` when the user clicked the OK button, `false` otherwise (Cancel or Escape).

### `prompt(options)`

Not supported on Electron. Always returns `{ value: '', cancelled: true }` without showing any UI.

| Return field | Value |
|--------------|-------|
| `value`      | `''` (empty string) |
| `cancelled`  | `true` |

Always check the `cancelled` field before using `value`:

```typescript
const { value, cancelled } = await Dialog.prompt({ title: '...', message: '...' });
if (!cancelled) {
  // use value — this branch is never reached on Electron
}
```

---

## Platform behaviour

Both `alert` and `confirm` block user interaction with the main window until dismissed — identical to the native modal behaviour on iOS/Android.

Pressing **Escape** in a `confirm` dialog is treated as Cancel (`value: false`).

`alert()` and `confirm()` are supported on macOS, Windows, and Linux. `prompt()` is a no-op stub on every desktop OS. See [platform-support.md](platform-support.md).

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| `prompt` | Not supported | Electron has no native input dialog API (`showInputBox` does not exist) |
