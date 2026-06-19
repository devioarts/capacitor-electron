# Splash screen

A frameless window shown while the main app loads in the background. The main window starts
hidden and appears atomically when the splash closes — users never see a partially loaded UI.

---

## Setup

### 1. Add an image

Place a splash image in `electron/assets/`:

```
electron/
  assets/
    splash.png   ← or any filename / format you like
```

Supported formats: PNG, JPEG, WebP, GIF, SVG. The image is loaded directly from disk —
no base64 encoding — so even a multi-megabyte file displays instantly.

### 2. Configure in `capacitor.config.ts`

Use just the **filename** — `assets/` is always the base directory:

```json
{
  "plugins": {
    "Electron": {
      "ui": {
        "splashScreen": {
          "image": "splash.png",
          "width": 600,
          "height": 400,
          "backgroundColor": "#1a1a2e",
          "minDisplayTime": 1500
        }
      }
    }
  }
}
```

That's it — no code changes required in `main.ts` or the renderer.

---

## Configuration options

All options live under `plugins.Electron.ui.splashScreen` in `capacitor.config.ts`.

| Option | Type | Default | Description |
|---|---|---|---|
| `ui.splashScreen.image` | `string` | — | **Required.** Splash image asset. Use `splash.png` for `electron/assets/splash.png`, or `/public/assets/splash.png` to copy from the project root during sync. Omitting this disables the splash screen entirely. |
| `ui.splashScreen.width` | `number` | `400` | Width of the splash window in px |
| `ui.splashScreen.height` | `number` | `300` | Height of the splash window in px |
| `ui.splashScreen.backgroundColor` | `string` | `'#ffffff'` | Window background color (any CSS color or `'transparent'`) |
| `ui.splashScreen.minDisplayTime` | `number` | `0` | Minimum time to show the splash in ms — prevents a flash when the app loads quickly |

---

## How it works

1. Splash window appears immediately on startup.
2. Main app window is created hidden in the background and starts loading.
3. Once the page finishes loading (or fails), the `minDisplayTime` countdown is checked:
   - If time is still remaining, the splash stays until the minimum is reached.
   - Then the splash closes and the main window appears — simultaneously.

The main window never shows before the splash closes, so there is no visible overlap.

---

## Notes

- The splash window is frameless, always-on-top, centered, and excluded from the taskbar.
- The image is displayed centered with `object-fit: contain` — it scales to fit without cropping.
- `minDisplayTime` is a floor, not a fixed duration. If the app takes longer to load, the
  splash stays until loading completes, even if that exceeds `minDisplayTime`.
- `backgroundColor: 'transparent'` enables a transparent window — works best with a PNG
  that has an alpha channel.
- The splash is shown in both development and production. Configure `ui.splashScreen` only
  in environments where you want it, or conditionally in `capacitor.config.ts`:

  ```ts
  const isDev = process.env.NODE_ENV === 'development';
  export default defineConfig({
    plugins: {
      Electron: {
        ui: {
          splashScreen: isDev ? undefined : {
            image: 'splash.png',
            minDisplayTime: 2000,
          },
        },
      },
    },
  });
  ```
