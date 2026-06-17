# Icons

There are two separate icon concepts in a packaged Electron app:

| | **Window icon** | **App bundle icon** |
|---|---|---|
| Where it appears | Title bar, taskbar (Windows/Linux), macOS Dock at runtime | OS file explorer, installer, Start Menu, Finder, `.exe`/`.app` file |
| How to configure | `plugins.Electron.icon` in `capacitor.config.json` | `assets/icon.png` picked up by `electron-builder.js` |
| Format | Any image (PNG recommended) | PNG 512×512 minimum, 1024×1024 recommended; optional `.icns`/`.ico` overrides |

---

## Window icon (`plugins.Electron.icon`)

Set in `capacitor.config.json`. Use just the **filename** when the file already lives in
`electron/assets/`:

```json
{
  "plugins": {
    "Electron": {
      "icon": "icon.png"
    }
  }
}
```

You can also use a leading slash to reference a file from the project root. During
`cap-electron sync`, the file is copied into `electron/assets/` and the generated
`electron/capacitor.config.json` is rewritten to the copied filename:

```json
{
  "plugins": {
    "Electron": {
      "icon": "/public/assets/icon.png"
    }
  }
}
```

This copies `public/assets/icon.png` to `electron/assets/icon.png` and writes
`"icon": "icon.png"` in the Electron config.

**Platform behavior:**
- **Windows** — shown in the window title bar and taskbar button
- **Linux** — shown in the window title bar and taskbar button
- **macOS** — updates the Dock icon at runtime via `app.dock.setIcon()`; has no effect on the `.app` bundle icon in Finder

---

## App bundle icon (`electron-builder.js`)

The bundle icon (shown in Finder, Explorer, the installer, and the `.exe`/`.app` file itself)
is configured via electron-builder — not at runtime.

Place `assets/icon.png` (minimum 512×512, recommended **1024×1024**) in `electron/assets/`.
electron-builder can convert it to the required platform formats:

| Platform | Used by electron-builder | Override file |
|---|---|---|
| macOS | `assets/icon.png` | `assets/icon.icns` |
| Windows | `assets/icon.png` | `assets/icon.ico` |
| Linux | `assets/icon.png` | — |

If Windows still shows the Electron icon, first check `electron-builder.js`: executable
resource editing must be enabled. This template uses `win.signExecutable: false` to skip
code signing while still allowing electron-builder to write the icon and metadata into
the `.exe`. Do not use `win.signAndEditExecutable: false` unless you intentionally want
to disable icon/metadata editing too.

For deterministic Windows output, you can also provide a real multi-size `assets/icon.ico`.
Recommended embedded sizes: 16, 24, 32, 48, 64, 128, and 256 px.

### Recommended file structure

```
electron/
  assets/
    icon.png        ← 1024×1024, used for package icons + runtime window icon
    splash.png      ← splash screen image (optional)
    icon.icns       ← optional macOS override
    icon.ico        ← optional Windows .exe / installer icon override
```

---

## Windows icon cache

After changing the `.exe` icon, Windows may still show the old icon due to the icon cache.
To force a refresh run in PowerShell (no admin needed):

```powershell
ie4uinit.exe -show
```

Or log out and back in.
