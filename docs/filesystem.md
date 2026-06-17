# Filesystem

Built-in Electron implementation of `@capacitor/filesystem`. No extra configuration required — install the Capacitor plugin and it works on Electron out of the box.

Uses Node.js `fs/promises` for all I/O. No extra dependencies.

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

### `getUri(options)`

```typescript
const { uri } = await Filesystem.getUri({ path, directory? });
```

Returns the absolute `file://` URI for a path without performing any I/O.

### `stat(options)`

```typescript
const { type, size, mtime, ctime, uri } = await Filesystem.stat({ path, directory? });
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
const { path } = await Filesystem.downloadFile({ url, path, directory?, headers? });
```

Fetches a remote URL and saves the response body to the given path. Uses global `fetch` (available in Node.js 18+ / Electron 20+). Creates parent directories automatically.

| Option    | Type     | Description |
|-----------|----------|-------------|
| `url`     | `string` | Remote URL to fetch |
| `path`    | `string` | Destination file path |
| `directory` | `string` | Optional Capacitor directory |
| `headers` | `object` | Optional HTTP headers |

Returns `{ path }` — the absolute filesystem path of the saved file.

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
| `requestPermissions()` | Not needed | Node.js has direct filesystem access; no permission prompt |
| Watching for file changes | Not supported | `@capacitor/filesystem` has no watch API |
| URIs from `getUri()` in `<img src>` | May need CSP adjustment | `file://` URLs require `img-src: file:` in the CSP — see [content-security-policy.md](content-security-policy.md) |
| Cross-volume `rename()` | Fails with `EXDEV` | OS limitation; use `copy()` + `deleteFile()` instead |
