# File Viewer

Electron implementation of `@capacitor/file-viewer`.

```ts
import { FileViewer } from '@capacitor/file-viewer';

await FileViewer.openDocumentFromLocalPath({ path: '/Users/me/file.pdf' });
await FileViewer.openDocumentFromUrl({ url: 'https://example.com/file.pdf' });
```

## Methods

| Method | Electron behavior |
|---|---|
| `openDocumentFromLocalPath({ path })` | Opens an absolute path or `file://` URL with the OS default application. |
| `openDocumentFromResources({ path })` | Opens a file from the packaged web resources directory. |
| `openDocumentFromUrl({ url })` | Opens `http`, `https`, or `file` URLs externally. |
| `previewMediaContentFrom*` | Aliases to the matching document-opening method. |

The upstream mobile plugin has iOS-specific media preview behavior. Electron uses native desktop file associations instead.
