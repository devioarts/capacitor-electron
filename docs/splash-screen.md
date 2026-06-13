# Splash screen

A frameless window shown while the main app window is loading. Closes automatically when the renderer fires `did-finish-load`.

---

## Setup

### 1. Add an image

Place a splash image anywhere under your project, conventionally in `electron/assets/`:

```
electron/
  assets/
    splash.png
```

Supported formats: `png`, `jpg`/`jpeg`, `svg`, `gif`, `webp`.

### 2. Configure in `capacitor.config.ts`

```typescript
plugins: {
  Electron: {
    splashScreen: {
      image: 'assets/splash.png',
      width: 600,
      height: 400,
      backgroundColor: '#1a1a2e',
      minDisplayTime: 1500,
    },
  },
},
```

That's it — no code changes in `main.ts` or the renderer.

---

## Configuration options

All options live under `plugins.Electron.splashScreen` in `capacitor.config.ts`.

| Option | Type | Default | Description |
|---|---|---|---|
| `image` | `string` | — | **Required.** Path to the splash image relative to the `electron/` directory (e.g. `assets/splash.png`). Omitting this disables the splash screen entirely. |
| `width` | `number` | `400` | Width of the splash window in px |
| `height` | `number` | `300` | Height of the splash window in px |
| `backgroundColor` | `string` | `'#ffffff'` | Window background color (any CSS color or `'transparent'`) |
| `minDisplayTime` | `number` | `0` | Minimum time to show the splash in ms — prevents a flash when the app loads quickly |

---

## Notes

- The splash window is frameless, always-on-top, centered, and excluded from the taskbar.
- The image is displayed centered with `object-fit: contain` — it scales to fit without cropping.
- `minDisplayTime` is a floor, not an exact duration. If the app takes longer to load, the splash stays visible until load completes.
- `backgroundColor: 'transparent'` enables a transparent window, which works best with a `png` that has an alpha channel.
- The splash is shown in both development and production. Set `splashScreen` only in the environments where you want it, or conditionally configure it in `capacitor.config.ts`.
