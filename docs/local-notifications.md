# Local notifications

Built-in Electron implementation of `@capacitor/local-notifications`. No extra configuration required — install the Capacitor plugin and it works on Electron out of the box.

---

## Setup

Install `@capacitor/local-notifications` in your Capacitor project:

```bash
npm install @capacitor/local-notifications
```

Run sync so the Capacitor config is updated:

```bash
npx cap-electron sync
```

That is all. The Electron implementation is bundled with `@devioarts/capacitor-electron` and registered automatically at startup. No `plugin-settings.js`, no manual IPC wiring.

---

## Basic usage

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

// Show a notification immediately
await LocalNotifications.schedule({
  notifications: [
    {
      id: 1,
      title: 'Hello',
      body: 'This is a native desktop notification.',
    },
  ],
});
```

Clicking the notification focuses the main window and fires the `localNotificationActionPerformed` event.

---

## Scheduling

### Show at a specific time

```typescript
await LocalNotifications.schedule({
  notifications: [
    {
      id: 2,
      title: 'Reminder',
      body: 'Time to take a break.',
      schedule: { at: new Date(Date.now() + 5 * 60_000) }, // 5 minutes from now
    },
  ],
});
```

### Repeat on an interval

```typescript
await LocalNotifications.schedule({
  notifications: [
    {
      id: 3,
      title: 'Hourly reminder',
      body: 'Still here.',
      schedule: {
        every: 'hour',
        repeats: true,  // keep repeating (default)
        count: 8,       // stop after 8 fires (omit for infinite)
      },
    },
  ],
});
```

`every` accepts: `'second'`, `'minute'`, `'hour'`, `'day'`, `'week'`, `'two-weeks'`, `'month'`, `'year'`.

### Silent notification

```typescript
await LocalNotifications.schedule({
  notifications: [
    {
      id: 4,
      title: 'Silent update',
      body: 'No sound.',
      silent: true,
    },
  ],
});
```

---

## Cancelling

```typescript
// Cancel one or more by id
await LocalNotifications.cancel({
  notifications: [{ id: 2 }, { id: 3 }],
});
```

Cancelling a pending notification removes it from the timer queue. Notifications that have already been shown cannot be dismissed from the OS notification centre programmatically.

---

## Events

### `localNotificationReceived`

Fires when a notification is displayed.

```typescript
await LocalNotifications.addListener('localNotificationReceived', (notification) => {
  console.log('Shown:', notification.title);
});
```

### `localNotificationActionPerformed`

Fires when the user clicks a notification. The main window is focused automatically before this event fires.

```typescript
await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification, actionId }) => {
  // actionId is always 'tap' on Electron
  console.log('Clicked notification:', notification.id);
});
```

---

## Full API reference

| Method | Electron | Notes |
|---|---|---|
| `schedule()` | ✓ | Supports immediate, `at`, `every` + `count` + `repeats` |
| `cancel()` | ✓ | Cancels pending timers by id |
| `getPending()` | ✓ | In-memory list — resets on restart |
| `getDeliveredNotifications()` | ✓ | In-memory list — resets on restart |
| `removeDeliveredNotifications()` | ✓ | Removes from in-memory list only |
| `removeAllDeliveredNotifications()` | ✓ | Clears in-memory list |
| `registerActionTypes()` | stub | No-op — action buttons not supported |
| `checkPermissions()` | ✓ | Always returns `granted` |
| `requestPermissions()` | ✓ | Always returns `granted` |
| `checkExactNotificationSetting()` | stub | Android-only — returns `granted` |
| `changeExactNotificationSetting()` | stub | Android-only — no-op |
| `areEnabled()` | ✓ | Reflects `Notification.isSupported()` |
| `createChannel()` | stub | Android-only — no-op |
| `deleteChannel()` | stub | Android-only — no-op |
| `listChannels()` | stub | Returns `{ channels: [] }` |

---

## Platform behaviour

### Windows

Windows Action Center requires an **App User Model ID** before the app is ready. The Electron implementation reads `appId` from `capacitor.config.json` and calls `app.setAppUserModelId(appId)` automatically at module load time.

In **development**, notifications may appear without an app name or icon in the Action Center unless the project has been at least partially packaged once (so Windows can associate the AUMID). In **production** (packaged app) they work correctly.

### macOS

Notifications work without any extra setup. The app icon is always used — the notification `icon` field has no effect on macOS.

### Linux

Works. Icon is not supported.

---

## Limitations

| Feature | Status | Reason |
|---|---|---|
| `schedule.on` (calendar scheduling) | Not supported | Requires OS-level scheduler; no Electron equivalent |
| Persistent pending / delivered lists | Not supported | State is in-memory and is lost on restart |
| Custom notification sound | Not supported | Electron exposes only `silent: true/false`, not a sound file path |
| Notification icon override | Not supported on macOS | macOS always shows the app icon |
| Action buttons (reply, custom) | Not supported | Requires platform-specific notification extensions |
| Attachments | Not supported | iOS-only feature |
| `channelId` / channels | No-op | Android-only concept |
| `smallIcon`, `iconColor`, `largeIcon` | No-op | Android-only fields |
| `threadIdentifier`, `summaryArgument` | No-op | iOS-only fields |

---

## Notes

- The `@capacitor/local-notifications` **config block** in `capacitor.config.ts` (`smallIcon`, `iconColor`, `sound`, `presentationOptions`) has no effect on Electron — all of those options are Android- or iOS-specific.
- Pending timers (`setTimeout` / `setInterval`) are automatically cleared on `will-quit`.
- Notifications that were scheduled and are pending but have not yet fired will disappear when the user quits the app — this is expected behaviour for a desktop app.
- If you need notifications that survive restarts, persist the schedule yourself and re-call `schedule()` on startup using the data you saved.
