# Action Sheet

Built-in Electron implementation of `@capacitor/action-sheet`. No extra configuration required — install the Capacitor plugin and it works on Electron out of the box.

---

## Setup

```bash
npm install @capacitor/action-sheet
npx cap-electron sync
```

---

## Basic usage

```typescript
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';

const { index } = await ActionSheet.showActions({
  title: 'Choose an action',
  message: 'Select one of the options below.',
  options: [
    { title: 'Edit' },
    { title: 'Delete', style: ActionSheetButtonStyle.Destructive },
    { title: 'Cancel', style: ActionSheetButtonStyle.Cancel },
  ],
});

if (index === 0) console.log('Edit selected');
if (index === 1) console.log('Delete selected');
// index === 2 → Cancel
```

---

## API reference

### `showActions(options)`

| Option    | Type     | Description |
|-----------|----------|-------------|
| `title`   | `string` | Dialog title shown above the buttons |
| `message` | `string` | Optional explanatory text below the title |
| `options` | `Array`  | Button definitions — see below |

#### Option object

| Field   | Type     | Description |
|---------|----------|-------------|
| `title` | `string` | Button label |
| `style` | `string` | `'DEFAULT'`, `'DESTRUCTIVE'`, or `'CANCEL'` |

#### Return value

| Field   | Type     | Description |
|---------|----------|-------------|
| `index` | `number` | Zero-based index of the button the user tapped |

---

## Platform behaviour

The dialog is rendered as a native OS message box (`dialog.showMessageBox`), not an HTML overlay. It blocks user interaction with the main window until dismissed — identical to the native modal behaviour on iOS/Android.

### Button styles

| Capacitor style | Electron behaviour |
|-----------------|--------------------|
| `DEFAULT`       | Normal button |
| `DESTRUCTIVE`   | Button prefixed with `⚠ ` (Electron dialog has no red-button support) |
| `CANCEL`        | Pressing Escape closes the dialog and returns this button's index |

### Only one `CANCEL` button

Only the first option with `style: 'CANCEL'` is registered as the Escape/cancel target. Additional cancel-styled buttons are rendered as normal buttons.

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| Red/coloured destructive buttons | Not supported | Electron's `showMessageBox` has no colour API for individual buttons |
| More than ~10 buttons | Unsupported by the OS | `showMessageBox` is not designed as a scrollable list |
| Icons on buttons | Not supported | No Electron API for per-button icons in a message box |
