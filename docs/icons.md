# Icons

There are two separate icon concepts in a packaged Electron app:

| | **Window icon** | **App bundle icon** |
|---|---|---|
| Where it appears | Title bar, taskbar (Windows/Linux), macOS Dock at runtime | OS file explorer, installer, Start Menu, Finder, `.exe`/`.app` file |
| How to configure | `plugins.Electron.icon` in `capacitor.config.json` | `assets/icon.png` picked up by `electron-builder.js` |
| Format | Any image (PNG recommended) | PNG 1024×1024 (auto-converts); or pre-built `.icns`/`.ico` |

---

## Window icon (`plugins.Electron.icon`)

Set in `capacitor.config.json`:

```json
{
  "plugins": {
    "Electron": {
      "icon": "assets/icon.png"
    }
  }
}
```

The path is relative to the `electron/` directory. The image file must be included in
`files` in `electron-builder.js` (see [assets in packaged app](#assets-in-packaged-app) below).

**Platform behavior:**
- **Windows** — shown in the window title bar and taskbar button
- **Linux** — shown in the window title bar and taskbar button
- **macOS** — updates the Dock icon at runtime via `app.dock.setIcon()`; has no effect on the `.app` bundle icon in Finder

---

## App bundle icon (`electron-builder.js`)

The bundle icon (shown in Finder, Explorer, the installer, and the `.exe`/`.app` file itself)
is configured via electron-builder — not at runtime.

Place `assets/icon.png` (minimum 512×512, recommended **1024×1024**) in `electron/assets/`.
electron-builder auto-converts it to the required platform formats:

| Platform | Generated from | Override file |
|---|---|---|
| macOS | `icon.png` → `.icns` | `assets/icon.icns` (used as-is if present) |
| Windows | `icon.png` → `.ico` | `assets/icon.ico` (used as-is if present) |
| Linux | `icon.png` | — |

If you need a hand-crafted `.icns` or `.ico` (e.g. for specific color profiles or embedded
sizes), place it in `assets/` and it will take priority over the auto-generated version.

### Recommended file structure

```
electron/
  assets/
    icon.png        ← 1024×1024, used for all platforms + runtime window icon
    splash.png      ← splash screen image (optional)
    icon.icns       ← optional macOS override
    icon.ico        ← optional Windows override
```

---

## Assets in packaged app

Both the window icon and the splash image are read from disk at runtime, so `assets/`
must be included in the packaged app. Open `electron/electron-builder.js` and verify:

```js
files: [
  'dist/**',
  '!dist/**/*.map',
  'capacitor.config.json',
  'assets/**',   // ← required
],
```

Without this line, `assets/icon.png` and `assets/splash.png` are not bundled and both
features silently do nothing in the packaged build.

---

## Windows icon cache

After changing the `.exe` icon, Windows may still show the old icon due to the icon cache.
To force a refresh run in PowerShell (no admin needed):

```powershell
ie4uinit.exe -show
```

Or log out and back in.
