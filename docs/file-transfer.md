# File Transfer

Electron implementation of `@capacitor/file-transfer`.

```ts
import { FileTransfer } from '@capacitor/file-transfer';
import { Filesystem, Directory } from '@capacitor/filesystem';

const file = await Filesystem.getUri({
  directory: Directory.Cache,
  path: 'download.html',
});

await FileTransfer.downloadFile({
  url: 'https://example.com/',
  path: file.uri,
  progress: true,
});
```

## Methods

| Method | Notes |
|---|---|
| `downloadFile(options)` | Supports `url`, `path`, `headers`, `params`, `method`, `progress`, and `disableRedirects`. |
| `uploadFile(options)` | Uploads a local file path using `fetch`; defaults to `POST` and `application/octet-stream`. |
| `addListener('progress', cb)` | Receives `{ type, url, bytes, contentLength, lengthComputable }`. |

`path` should be an absolute path or `file://` URL. Use `Filesystem.getUri()` first when you want Capacitor-style directory resolution.
