# Filesystem

Built-in Electron implementation of `@capacitor/filesystem`. No extra configuration required — install the Capacitor plugin and it works on Electron out of the box.

Uses Node.js `fs/promises` for all I/O. No extra dependencies.

Official reference: [Capacitor Filesystem API](https://capacitorjs.com/docs/apis/filesystem).

---

## Setup

```bash
npm install @capacitor/filesystem
npx cap-electron sync
```

---

## Directory mapping

The Capacitor `Directory` enum maps to Electron paths:

| Capacitor `Directory` | Electron path |
|-----------------------|---------------|
| `DOCUMENTS`           | `app.getPath('documents')` |
| `DATA`                | `app.getPath('userData')` |
| `LIBRARY`             | `app.getPath('userData')` |
| `CACHE`               | `app.getPath('temp')` |
| `EXTERNAL`            | `app.getPath('downloads')` |
| `EXTERNAL_STORAGE`    | `app.getPath('downloads')` |
| *(omitted)*           | `path` is treated as an absolute path |

`Directory.CACHE` maps to Electron's `temp` path. Treat it as volatile storage:
the operating system or cleanup tools may delete files there without app-level
coordination. Use `Directory.DATA` / `Directory.LIBRARY` for app-owned data that
must survive restarts.

---

## Basic usage

```typescript
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// Write a file
await Filesystem.writeFile({
  path: 'myfile.txt',
  directory: Directory.Documents,
  data: 'Hello, Electron!',
  encoding: Encoding.UTF8,
});

// Read it back
const { data } = await Filesystem.readFile({
  path: 'myfile.txt',
  directory: Directory.Documents,
  encoding: Encoding.UTF8,
});

console.log(data); // Hello, Electron!
```

---

## API reference

### `checkPermissions()`

```typescript
const { publicStorage } = await Filesystem.checkPermissions();
```

Returns `{ publicStorage: 'granted' }`. Desktop filesystem access is handled by the app process and does not trigger Android-style runtime permission prompts.

### `requestPermissions()`

```typescript
const { publicStorage } = await Filesystem.requestPermissions();
```

Returns `{ publicStorage: 'granted' }` for API compatibility.

### `readFile(options)`

```typescript
const { data } = await Filesystem.readFile({ path, directory?, encoding? });
```

- With `encoding` → returns the file content as a string.
- Without `encoding` → returns the file content Base64-encoded.

### `writeFile(options)`

```typescript
await Filesystem.writeFile({ path, directory?, data, encoding?, recursive? });
```

- With `encoding` → `data` is written as a string.
- Without `encoding` → `data` is decoded from Base64 before writing.
- `recursive: true` → creates parent directories automatically (`mkdirp`).

Returns `{ uri }` — the absolute `file://` URI of the written file.

### `appendFile(options)`

```typescript
await Filesystem.appendFile({ path, directory?, data, encoding? });
```

Same encoding semantics as `writeFile`. Appends to the file; creates it if it does not exist.

### `deleteFile(options)`

```typescript
await Filesystem.deleteFile({ path, directory? });
```

### `mkdir(options)`

```typescript
await Filesystem.mkdir({ path, directory?, recursive? });
```

`recursive: true` → equivalent to `mkdir -p`.

### `rmdir(options)`

```typescript
await Filesystem.rmdir({ path, directory?, recursive? });
```

`recursive: true` → removes the directory and all its contents.

### `readdir(options)`

```typescript
const { files } = await Filesystem.readdir({ path, directory? });
```

Each entry in `files` contains:

| Field   | Type     | Description |
|---------|----------|-------------|
| `name`  | `string` | Entry name |
| `type`  | `string` | `'file'` or `'directory'` |
| `size`  | `number` | Size in bytes |
| `mtime` | `number` | Last-modified timestamp in milliseconds |
| `ctime` | `number` | Created/changed timestamp in milliseconds |
| `uri`   | `string` | Absolute `file://` URI |
| `path`  | `string` | Absolute filesystem path |

### `getUri(options)`

```typescript
const { uri, path } = await Filesystem.getUri({ path, directory? });
```

Returns the absolute `file://` URI and filesystem path without performing any I/O.

### `stat(options)`

```typescript
const { type, size, mtime, ctime, uri, path } = await Filesystem.stat({ path, directory? });
```

### `rename(options)`

```typescript
await Filesystem.rename({ from, to, directory?, toDirectory? });
```

Renames or moves a file or directory. `directory` is the source directory; `toDirectory` is the destination directory. If `toDirectory` is omitted, the destination uses `directory`. Cross-directory moves work only within the same filesystem volume.

### `copy(options)`

```typescript
const { uri } = await Filesystem.copy({ from, to, directory?, toDirectory? });
```

Copies a file or directory. `directory` is the source directory; `toDirectory` is the destination directory. If `toDirectory` is omitted, the destination uses `directory`. Returns the `file://` URI of the destination path.

### `downloadFile(options)`

```typescript
const { path, uri } = await Filesystem.downloadFile({ url, path, directory?, headers? });
```

Fetches a remote URL and saves the response body to the given path. Uses global `fetch` (available in Node.js 18+ / Electron 20+). Creates parent directories automatically.

| Option    | Type     | Description |
|-----------|----------|-------------|
| `url`     | `string` | Remote URL to fetch |
| `path`    | `string` | Destination file path |
| `directory` | `string` | Optional Capacitor directory |
| `headers` | `object` | Optional HTTP headers |

Returns `{ path, uri }` — the absolute filesystem path and `file://` URI of the saved file.

---

## Supported operating systems

All Filesystem methods are supported on macOS, Windows, and Linux. Path roots differ by OS through Electron `app.getPath()`; see [platform-support.md](platform-support.md) for the full matrix.

---

## Encoding

| Capacitor encoding | Node.js encoding |
|--------------------|-----------------|
| `utf8` / `utf-8`   | `utf-8`         |
| `ascii`            | `ascii`         |
| `utf16` / `utf-16` | `utf16le`       |
| *(omitted)*        | Binary (Base64) |

---

## Error codes

Common errors are mapped to Capacitor-compatible messages:

| Node.js code | Thrown message |
|--------------|----------------|
| `ENOENT`     | `File does not exist` |
| `EEXIST`     | `Directory exists` |
| `ENOTDIR`    | `Not a directory` |
| `EISDIR`     | `Is a directory` |
| `EACCES`     | `Permission denied` |
| `ENOTEMPTY`  | `Directory not empty` |

---

## Limitations

| Feature | Status | Reason |
|---------|--------|--------|
| `requestPermissions()` prompt | Not shown | Node.js has direct filesystem access; the method returns `granted` for API compatibility |
| `readFileInChunks()` | Not supported | Requires a method-specific callback bridge that can deliver multiple chunks for one method call |
| `addListener('progress')` for `Filesystem.downloadFile()` | Not supported | Deprecated upstream for `Filesystem.downloadFile()`; use `@capacitor/file-transfer` for progress events |
| Watching for file changes | Not supported | `@capacitor/filesystem` has no watch API |
| URIs from `getUri()` in `<img src>` | May need CSP adjustment | `file://` URLs require `img-src: file:` in the CSP — see [content-security-policy.md](content-security-policy.md) |
| Cross-volume `rename()` | Fails with `EXDEV` | OS limitation; use `copy()` + `deleteFile()` instead |

`readFileInChunks()` is more than a normal promise method. Capacitor calls it with
a callback that receives several chunk payloads over time, then a final completion
or error. The current built-in Electron bridge has promise methods
(`nativePromise`) and event listeners (`addListener` / `removeListener`), but it
does not yet have a generic path for "one method call owns one temporary
callback stream". Implementing this cleanly would require bridge work in preload,
main-process dispatch, cancellation/cleanup, and tests for large files and closed
renderer windows.

The old `Filesystem.downloadFile()` progress listener is intentionally not added
because Capacitor has deprecated that path in favor of `@capacitor/file-transfer`.
This package implements `FileTransfer.downloadFile()` / `uploadFile()` with
`progress` events, so new code should use that API for downloads that need
progress reporting.
