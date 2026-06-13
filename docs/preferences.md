# Preferences

Built-in Electron implementation of `@capacitor/preferences`. No extra configuration required — install the Capacitor plugin and it works on Electron out of the box.

Data is stored in `{userData}/preferences.json`. An in-memory Map serves as a write-through cache so reads never hit disk.

---

## Setup

```bash
npm install @capacitor/preferences
npx cap-electron sync
```

---

## Basic usage

```typescript
import { Preferences } from '@capacitor/preferences';

// Write
await Preferences.set({ key: 'theme', value: 'dark' });

// Read
const { value } = await Preferences.get({ key: 'theme' });
console.log(value); // 'dark'

// Delete
await Preferences.remove({ key: 'theme' });
```

---

## API reference

### `set(options)`

```typescript
await Preferences.set({ key: string, value: string });
```

Stores a string value. The store is persisted to disk after each write.

### `get(options)`

```typescript
const { value } = await Preferences.get({ key: string });
```

Returns `{ value: string }` or `{ value: null }` when the key does not exist.

### `remove(options)`

```typescript
await Preferences.remove({ key: string });
```

Deletes the key. A no-op when the key does not exist.

### `clear()`

```typescript
await Preferences.clear();
```

Removes all stored keys.

### `keys()`

```typescript
const { keys } = await Preferences.keys();
```

Returns all stored key names.

### `migrate()`

```typescript
const { migrated, existing } = await Preferences.migrate();
// migrated: [], existing: []
```

No-op — there is no `localStorage` data to migrate on Electron. Returns empty arrays.

### `removeOld()`

```typescript
await Preferences.removeOld();
```

No-op.

---

## Storage location

| Platform | Path |
|----------|------|
| Windows  | `%APPDATA%\{appName}\preferences.json` |
| macOS    | `~/Library/Application Support/{appName}/preferences.json` |
| Linux    | `~/.config/{appName}/preferences.json` |

The file is created automatically on the first write.

---

## Why not `localStorage`?

The web fallback for `@capacitor/preferences` uses `localStorage`. On Electron this works, but has drawbacks:

| | `localStorage` | This implementation |
|---|---|---|
| Cleared by "Clear browsing data" | Yes | No |
| Size limit | ~5–10 MB | No limit (filesystem) |
| Accessible from main process | No | Yes (plain JSON) |
| `clearAll` side-effects | May clear Chromium internals | Isolated file |

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| `group` (namespace) | Ignored | All keys share one flat key space. The default group `'CapacitorStorage'` has no effect |
| `migrate()` / `removeOld()` | No-op | No `localStorage` migration path on Electron |
| Concurrent access from multiple processes | Not safe | `writeFileSync` is not coordinated across processes |
