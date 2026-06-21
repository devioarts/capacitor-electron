# Feature Testing Tracker

> Version: **0.1.1** | Updated: 2026-06-20

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Tested and working |
| ⚠️ | Tested — partial or known issues |
| ❌ | Tested — failing |
| 🧪 | Not yet tested |
| 🚧 | In progress / not complete |
| — | Not applicable on this platform |

**Column headers:** `macOS` = Apple Silicon · `win` = Windows x64 · `lin` = Linux x64

**Steps / Expected column:** describes the minimal sequence to exercise the feature and the correct observable outcome. Write deviations and remarks directly into the result cell (e.g. `⚠️ dialog opens but title is wrong`).

---

## CLI Commands

Run all commands from the Capacitor project root. Requires a valid Capacitor project with `@devioarts/capacitor-electron` installed.

| Command | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `add` | `npx cap-electron add` on a clean project → Expected: `electron/` directory created with full file structure; `capacitor.config.ts` patched; `sync` runs automatically | ✅ | 🧪 | 🧪 | |
| `scripts` | `npx cap-electron scripts` after `add` → Expected: `electron:sync`, `electron:copy`, and `electron:open` added to root `package.json` without overwriting existing scripts | ✅ | 🧪 | 🧪 | |
| `copy` | Build web app → `npx cap-electron copy` → Expected: `webDir` output copied to `electron/app/`; `electron-init.js` injected into `index.html` | ✅ | 🧪 | 🧪 | |
| `update` | `npx cap-electron update` → Expected: plugin bridges in `src/generated/` regenerated; global types injected; config synced; asset paths normalised | ✅ | 🧪 | 🧪 | |
| `sync` | `npx cap-electron sync` → Expected: runs `copy` then `update`; if `copy` fails, `update` still runs | ✅ | 🧪 | 🧪 | |
| `open` / `run` (dev) | `npx cap-electron open` or `npx cap-electron run` → Expected: Vite dev server starts; Electron launches pointing to dev URL; app loads in window | ⚠️ | 🧪 | 🧪 | Process cleanup on Ctrl+C may leave orphans |
| Hot-restart on main change | While `open` running → edit `electron/dist/main.cjs` → Expected: Electron main process restarts automatically; window reloads | ✅ | ✅ | 🧪 | |
| Renderer reload on preload change | While `open` running → edit `electron/dist/preload.cjs` → Expected: renderer window reloads automatically | ✅ | ✅ | 🧪 | |
| `build` | `npx cap-electron build` → Expected: Electron sources compiled; electron-builder packages for host OS; installer artifact created in `electron/dist/` | ✅ | 🧪 | 🧪 | |
| `build mac` | Run on macOS → Expected: `.dmg` created | ✅ | — | — | Gatekeeper requires code signing for unsigned-build warnings |
| `build win` | Run on Windows → Expected: NSIS `.exe` installer created | — | 🧪 | — | |
| `build linux` | Run on Linux → Expected: AppImage (or configured target) created | — | — | 🧪 | |
| `kill` | With a running Electron instance → `npx cap-electron kill` → Expected: Node/Electron processes bound to project root terminated; exit code 0 | ✅ | 🧪 | 🧪 | |
| `upgrade` | On existing project → Expected: `src/system/` updated from template; `src/user/` files left intact; generated files cleaned and regenerated | ✅ | 🧪 | 🧪 | |
| `upgrade --all` | → Expected: also updates `electron-builder.js`, `tsconfig.json`; merges template deps/scripts into `package.json` | ✅ | 🧪 | 🧪 | |
| `restore` | After failed upgrade → Expected: system files restored from template; user files unaffected | ✅ | 🧪 | 🧪 | |

---

## Electron Bridge (`window.Electron`)

### Main window — Playground: **Window tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `minimize()` | Window → Window controls → **minimize()** → Expected: window minimises to Dock / taskbar | ✅ | ✅ | 🧪 | |
| `maximize()` | Window → **maximize()** → Expected: window fills screen | ✅ | ✅ | 🧪 | |
| `unmaximize()` | Maximise first → **unmaximize()** → Expected: window returns to previous size | ✅ | ✅ | 🧪 | |
| `toggleMaximize()` | Window → **toggleMaximize()** repeatedly → Expected: alternates between maximised and restored each call | ✅ | ✅ | 🧪 | |
| `isMaximized()` | Maximise window → **isMaximized()** → Expected: `true`; restore → `false` | ✅ | ✅ | 🧪 | |
| `focus()` | Minimise window manually → Window → **focus()** → Expected: window comes to foreground | ✅ | ✅ | 🧪 | |
| `setFullscreen(true)` | Window → Fullscreen → **setFullscreen(true)** → Expected: enters full-screen; title bar / menu bar hidden | ✅ | ✅ | 🧪 | |
| `setFullscreen(false)` | While fullscreen → **setFullscreen(false)** → Expected: exits full-screen; window returns to previous bounds | ✅ | ✅ | 🧪 | |
| `isFullscreen()` | Window → **isFullscreen()** → Expected: `false` in normal state; `true` while fullscreen | ✅ | ✅ | 🧪 | |
| `reload()` | Window → Destructive → **reload()** → Expected: renderer reloads; app state resets to initial | ✅ | ✅ | 🧪 | |
| `quit()` | Window → Destructive → **quit()** → Expected: application exits completely | ✅ | ✅ | 🧪 | |
| `getAppVersion()` | Electron Info tab → **getAppVersion** button → Expected: version string matching `package.json` version field | ✅ | ✅ | 🧪 | |
| `openDevTools()` | Window → DevTools → **openDevTools()** → Expected: Chrome DevTools panel opens | ✅ | ✅ | 🧪 | |
| `closeDevTools()` | With DevTools open → **closeDevTools()** → Expected: DevTools panel closes | ✅ | ✅ | 🧪 | |
| `setBadgeCount(n)` | Window → Badge count → enter number → **setBadgeCount()** → Expected: numeric badge shown on Dock / taskbar icon | 🧪 | 🧪 | — | macOS: Dock badge · Windows: requires app identity · Linux: unsupported |
| `getBadgeCount()` | After `setBadgeCount(5)` → **getBadgeCount()** → Expected: returns `5` | 🧪 | 🧪 | — | |
| Badge clear (`setBadgeCount(0)`) | After setting badge → **Clear badge** → Expected: badge removed from icon | 🧪 | 🧪 | — | |
| `onElectronError` listener | Electron Info → Events → **enable onElectronError** → trigger an uncaught error in main process → Expected: event logged with message and stack | 🧪 | 🧪 | 🧪 | Requires deliberate main-process error or test hook |
| Bridge capabilities grid | Electron Info → Expected: green dot for all 10 core bridges (dialogs, secureStorage, protocols, session, downloads, print, desktopCapture, autoLaunch, nativeTheme, windows); updater dot red/absent if `app.autoUpdater.enabled: false`; onDeepLink dot red/absent if `app.deepLinkingScheme` not set | 🧪 | 🧪 | 🧪 | |
| Inspect bridge keys | Electron Info → **inspect bridge keys** → Expected: sorted list of all keys on `window.Electron` logged | 🧪 | 🧪 | 🧪 | |

### Dialogs — Playground: **Dialogs tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `showOpenDialog` — single file | Dialogs → Open dialog → single mode → **Open** → select one file → Expected: `{ filePaths: ["<path>"] }` | 🧪 | 🧪 | 🧪 | |
| `showOpenDialog` — multi-select | Enable multi-select → **Open** → select multiple files → Expected: array with multiple paths | 🧪 | 🧪 | 🧪 | |
| `showOpenDialog` — directory | Enable directory picker → **Open** → select folder → Expected: `{ filePaths: ["<dir>"] }` | 🧪 | 🧪 | 🧪 | |
| `showOpenDialog` — cancel | Open dialog → press **Cancel** → Expected: `{ filePaths: [] }` or `undefined` (no selection) | 🧪 | 🧪 | 🧪 | |
| `showOpenDialog` — filter preset | Select a filter preset (Images / Documents / Videos / Archives) → **Open** → Expected: file picker shows only matching extensions | 🧪 | 🧪 | 🧪 | |
| `showOpenDialog` — custom extensions | Enter custom extensions (e.g. `json,yaml`) → **Open** → Expected: file picker filters to those extensions only | 🧪 | 🧪 | 🧪 | |
| `showSaveDialog` — basic | Dialogs → Save dialog → enter default filename → **Save** → Expected: OS save dialog opens; chosen path returned | 🧪 | 🧪 | 🧪 | |
| `showSaveDialog` — cancel | Save dialog → **Cancel** → Expected: `undefined` returned | 🧪 | 🧪 | 🧪 | |
| `showSaveDialog` — filter preset | Select filter preset → **Save** → Expected: save dialog filters extensions | 🧪 | 🧪 | 🧪 | |
| `showMessageBox` — info | Dialogs → Message boxes → **showMessageBox info** → Expected: info dialog; clicking OK returns `{ response: 0 }` | 🧪 | 🧪 | 🧪 | |
| `showMessageBox` — question (multi-button) | **showMessageBox question** (2+ buttons) → click second button → Expected: `{ response: 1 }` | 🧪 | 🧪 | 🧪 | |
| `showMessageBox` — cancelId | showMessageBox with cancelId set → press Escape → Expected: `{ response: <cancelId> }` | 🧪 | 🧪 | 🧪 | Escape behaviour may vary by OS |
| `showErrorBox` | Dialogs → **showErrorBox** → Expected: error dialog with title + body; click OK to dismiss | 🧪 | 🧪 | 🧪 | |

### Secure Storage — Playground: **Secure storage tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `set(key, value)` | Secure storage → enter key + value → **set()** → Expected: no error; value persisted | 🧪 | 🧪 | 🧪 | macOS: Keychain · Windows: DPAPI · Linux: secret-service |
| `get(key)` existing | After `set()` → **get(same key)** → Expected: returns exact stored value | 🧪 | 🧪 | 🧪 | |
| `get(key)` nonexistent | **get()** on unknown key → Expected: returns `null` or `undefined` | 🧪 | 🧪 | 🧪 | |
| `keys()` | Store multiple keys → **keys()** → Expected: array listing all stored key names | 🧪 | 🧪 | 🧪 | |
| `remove(key)` | After `set()` → **remove(key)** → `get(key)` → Expected: `null` | 🧪 | 🧪 | 🧪 | |
| `clear()` | Store multiple entries → **clear()** → `keys()` → Expected: empty array | 🧪 | 🧪 | 🧪 | |
| Persistence across restarts | `set(key, value)` → quit app → relaunch → `get(key)` → Expected: value still present | 🧪 | 🧪 | 🧪 | |
| `isEncryptionAvailable()` | Secure storage → **isEncryptionAvailable()** → Expected: `true` on macOS and Windows; `true` or `false` on Linux | 🧪 | 🧪 | 🧪 | Linux: may be `false` in headless / minimal env |
| `getSelectedStorageBackend()` | → Expected: `safeStorage` on macOS / Windows; `safeStorage` or `basic_text` on Linux | 🧪 | 🧪 | 🧪 | |
| `encryptString(value)` | Enter plaintext → **encryptString()** → Expected: opaque hex / base64 string returned | 🧪 | 🧪 | 🧪 | |
| `decryptString(encrypted)` | After `encryptString()` → **decryptString(result)** → Expected: original plaintext returned | 🧪 | 🧪 | 🧪 | |

### Protocols — Playground: **Protocols tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `getConfiguredSchemes()` | Protocols → **getConfiguredSchemes()** → Expected: array of custom scheme names from config | 🧪 | 🧪 | 🧪 | |
| `isProtocolHandled(scheme)` | Enter scheme → **isProtocolHandled()** → Expected: `true` if intercepted by app; `false` otherwise | 🧪 | 🧪 | 🧪 | |
| `isDefaultProtocolClient(scheme)` | → Expected: `true` if this app is OS-level default handler | 🧪 | 🧪 | 🧪 | Windows: packaged build required |
| `setAsDefaultProtocolClient(scheme)` | → Expected: returns `true`; OS routes scheme to this app | 🧪 | 🧪 | 🧪 | Windows: packaged build required · Linux: depends on DE |
| `removeAsDefaultProtocolClient(scheme)` | After `setAsDefault` → **remove** → Expected: returns `true`; OS handler removed | 🧪 | 🧪 | 🧪 | |
| `openExternal(url)` | Enter URL → **openExternal()** → Expected: URL opens in system default browser | 🧪 | 🧪 | 🧪 | |

### Session — Playground: **Session tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `getUserAgent()` | Session → User agent section → **getUserAgent()** → Expected: current UA string logged | 🧪 | 🧪 | 🧪 | |
| `setUserAgent(string)` | Enter custom UA → **setUserAgent()** → `getUserAgent()` → Expected: returns new UA | 🧪 | 🧪 | 🧪 | |
| `resolveProxy(url)` | Enter URL → **resolveProxy()** → Expected: PAC proxy string returned (e.g. `DIRECT`) | 🧪 | 🧪 | 🧪 | |
| `setProxy(rules)` | Enter proxy rules → **setProxy()** → `resolveProxy()` → Expected: proxy rules reflected | 🧪 | 🧪 | 🧪 | |
| `setProxy({})` (reset) | After `setProxy(rules)` → **reset proxy** → `resolveProxy()` → Expected: returns `DIRECT` | 🧪 | 🧪 | 🧪 | |
| `closeAllConnections()` | Session → **closeAllConnections()** → Expected: returns without error | 🧪 | 🧪 | 🧪 | |
| `clearCache()` | Session → Clear cache section → **clearCache()** → Expected: returns without error | 🧪 | 🧪 | 🧪 | |
| `clearStorageData()` — all | No storage type selected → **clearStorageData()** → Expected: all storage types cleared | 🧪 | 🧪 | 🧪 | |
| `clearStorageData()` — per-type | Toggle one or more type chips (cookies / indexdb / localstorage / serviceworkers / cachestorage / filesystem / shadercache / websql) → **clearStorageData()** → Expected: only selected types cleared | 🧪 | 🧪 | 🧪 | |
| `setCookie(details)` | Cookies section → enter URL + name + value → **setCookie()** → Expected: no error | 🧪 | 🧪 | 🧪 | |
| `getCookies(filter)` | After `setCookie()` → enter URL filter → **getCookies()** → Expected: array contains the set cookie | 🧪 | 🧪 | 🧪 | |
| `removeCookie(url, name)` | After `setCookie()` → **removeCookie()** → `getCookies()` → Expected: cookie absent from result | 🧪 | 🧪 | 🧪 | |

### Downloads — Playground: **Downloads tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `start(url)` — default save path | Downloads → enter URL → **start (no path)** → Expected: file saved to default downloads folder; `started` event logged | 🧪 | 🧪 | 🧪 | |
| `start(url, savePath)` — explicit path | Enter URL + absolute save path → **start()** → Expected: file saved exactly at specified path | 🧪 | 🧪 | 🧪 | |
| `started` event | Start any download → Expected: `started` event logged with `id`, `url`, `savePath`, `totalBytes` | 🧪 | 🧪 | 🧪 | |
| `updated` events (progress) | Download a large file → Expected: repeated `updated` events with increasing `receivedBytes` and `percent` | 🧪 | 🧪 | 🧪 | |
| `completed` event | After full download → Expected: `completed` event with final `savePath` | 🧪 | 🧪 | 🧪 | |
| `getActive()` | During active download → **getActive()** → Expected: array with current item (id, url, receivedBytes, totalBytes) | 🧪 | 🧪 | 🧪 | |
| `pause(id)` | During active download → **pause()** → Expected: `updated` event with paused state; download halts | 🧪 | 🧪 | 🧪 | |
| `resume(id)` | After `pause()` → **resume()** → Expected: download continues; `updated` events resume | 🧪 | 🧪 | 🧪 | |
| `cancel(id)` | During active download → **cancel()** → Expected: `cancelled` event logged; file not complete | 🧪 | 🧪 | 🧪 | |
| `interrupted` event | Simulate network loss during download → Expected: `interrupted` event logged | 🧪 | 🧪 | 🧪 | |

### Print — Playground: **Print tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `getPrinters()` | Print → **getPrinters()** → Expected: array of printer objects; at minimum the system default printer listed | 🧪 | 🧪 | 🧪 | Returns empty array if no printers installed |
| `print()` — native dialog | Print → **print (with dialog)** → Expected: OS print dialog opens; confirm → page sent to printer | 🧪 | 🧪 | 🧪 | Requires installed printer |
| `print()` — silent | Print → **print silent** → Expected: page sent directly to default printer without dialog | 🧪 | 🧪 | 🧪 | Requires installed printer |
| `printToPDF()` — to file path | Enter absolute destination path → **printToPDF()** → Expected: `{ path: "…" }` returned; PDF file created at that path and opens correctly | 🧪 | 🧪 | 🧪 | |
| `printToPDF()` — base64 return | Leave path empty → **printToPDF()** → Expected: `{ data: "<base64>" }` returned; download link appears automatically; click link → PDF downloaded | 🧪 | 🧪 | 🧪 | |
| `printToPDF` — A4 page size | Select A4 → printToPDF → Expected: PDF page dimensions 210 × 297 mm | 🧪 | 🧪 | 🧪 | |
| `printToPDF` — Letter page size | Select Letter → Expected: 215.9 × 279.4 mm | 🧪 | 🧪 | 🧪 | |
| `printToPDF` — Legal page size | Select Legal → Expected: 215.9 × 355.6 mm | 🧪 | 🧪 | 🧪 | |
| `printToPDF` — A3 page size | Select A3 → Expected: 297 × 420 mm | 🧪 | 🧪 | 🧪 | |
| `printToPDF` — landscape | Enable landscape → printToPDF → Expected: PDF in landscape orientation (width > height) | 🧪 | 🧪 | 🧪 | |
| `printToPDF` — printBackground | Enable printBackground → printToPDF → Expected: PDF includes CSS background colours | 🧪 | 🧪 | 🧪 | |

### Desktop Capture — Playground: **Capture tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `getSources(['screen'])` | Capture → select **screen** → **getSources()** → Expected: list of screen sources; each card shows source name, id, thumbnail image | 🧪 | 🧪 | 🧪 | macOS: requires Screen Recording permission |
| `getSources(['window'])` | Select **window** → Expected: list of open window sources with thumbnails | 🧪 | 🧪 | 🧪 | macOS: Screen Recording permission · Linux: varies by display server |
| `getSources(['screen','window'])` | Select **all** → Expected: combined screens + windows list | 🧪 | 🧪 | 🧪 | |
| `thumbnailSize` option | Set thumbnailSize (e.g. 320 × 180) → **getSources()** → Expected: thumbnails have approximately the configured dimensions | 🧪 | 🧪 | 🧪 | |
| `fetchWindowIcons` option | Enable **fetchWindowIcons** → getSources(window type) → Expected: app icon column populated for window sources | 🧪 | 🧪 | 🧪 | |
| Thumbnail rendering | → Expected: each source card renders `<img>` from thumbnail data URL (not blank); "no thumbnail" shown only when thumbnail is genuinely empty | 🧪 | 🧪 | 🧪 | |

### Auto Launch — Playground: **Auto launch tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `isEnabled()` | Auto launch → **isEnabled()** → Expected: `false` on first run; `true` after enabling | 🧪 | 🧪 | — | Linux: always returns `false` (deliberate no-op) |
| `setEnabled(true)` | → **setEnabled(true)** → log out / reboot → Expected: app launches at login; `isEnabled()` returns `true` | 🧪 | 🧪 | — | Dev-mode path may work on macOS; packaged app more reliable on Windows |
| `setEnabled(false)` | After enabling → **setEnabled(false)** → reboot → Expected: app does NOT auto-start; `isEnabled()` returns `false` | 🧪 | 🧪 | — | |
| `getSettings()` | Auto launch → **getSettings()** → Expected: `{ openAtLogin: bool, … }` object | 🧪 | 🧪 | — | |

### Native Theme — Playground: **Theme tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `get()` snapshot | Theme → **get()** → Expected: `{ themeSource, shouldUseDarkColors, shouldUseHighContrastColors, shouldUseInvertedColorScheme }` | 🧪 | 🧪 | 🧪 | |
| `setThemeSource('light')` | Theme → **setThemeSource light** → Expected: app uses light mode regardless of OS setting; `shouldUseDarkColors: false` | 🧪 | 🧪 | 🧪 | |
| `setThemeSource('dark')` | → **setThemeSource dark** → Expected: app uses dark mode; `shouldUseDarkColors: true` | 🧪 | 🧪 | 🧪 | |
| `setThemeSource('system')` | After forcing light or dark → **setThemeSource system** → Expected: app reverts to OS appearance; `themeSource: 'system'` | 🧪 | 🧪 | 🧪 | |
| `onUpdated` listener | Theme tab → listener auto-active on mount → change OS appearance (System Preferences / Settings) → Expected: `updated` event fires with new theme state logged | 🧪 | 🧪 | 🧪 | |

### Managed Windows — Playground: **Managed windows tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `create({ appPath })` — internal app route | Managed windows → choose internal route mode → enter `#/settings` or `/` → **create()** → Expected: new trusted app window opens with the Electron preload bridge available | 🧪 | 🧪 | 🧪 | Use hash routes when production `serveMode` is `file` |
| `create({ url })` — valid HTTPS | Managed windows → choose external URL mode → enter `https://` URL → **create()** → Expected: new untrusted `BrowserWindow` opens without the preload bridge; appears in `list()` result | 🧪 | 🧪 | 🧪 | |
| `create({ url })` — non-HTTP rejection | Enter `file:///etc/passwd` or `javascript:alert(1)` in external URL mode → **create()** → Expected: error returned; no window opened | 🧪 | 🧪 | 🧪 | Security guard — non-http(s) URLs must be rejected |
| `list()` | After creating windows → **list()** → Expected: array of `ManagedWindowInfo` with `id`, `url`, `title`, `visible` for each | 🧪 | 🧪 | 🧪 | |
| Window selection UI | **list()** → click a row → Expected: row highlighted; per-window action buttons appear | 🧪 | 🧪 | 🧪 | |
| `focus(id)` | Select a window → **focus()** → Expected: that window comes to foreground | 🧪 | 🧪 | 🧪 | |
| `hide(id)` | Select window → **hide()** → Expected: window hidden; still in `list()` with `visible: false` | 🧪 | 🧪 | 🧪 | |
| `show(id)` | After `hide()` → **show()** → Expected: window visible again; `visible: true` in list | 🧪 | 🧪 | 🧪 | |
| `setBounds(id, bounds)` | Select window → enter x, y, width, height → **setBounds()** → Expected: window moves and resizes to specified bounds | 🧪 | 🧪 | 🧪 | |
| `close(id)` | Select window → **close()** → Expected: window closed; removed from subsequent `list()` | 🧪 | 🧪 | 🧪 | |
| `openExternal(url)` | Managed windows → enter URL → **openExternal()** → Expected: URL opens in system default browser | 🧪 | 🧪 | 🧪 | |
| Refresh list | After any mutating action → list auto-refreshes → Expected: list reflects new state without manual refresh | 🧪 | 🧪 | 🧪 | |

### Global Shortcuts — Playground: **Shortcuts tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `registerShortcut(accelerator, event)` | Shortcuts → enter accelerator (e.g. `CmdOrCtrl+Shift+1`) + event name → **register** → Expected: returns `true`; shortcut active globally | ✅ | ✅ | 🧪 | Can fail for OS-reserved accelerators |
| `registerShortcut` — unavailable accelerator | Enter an OS-reserved combo → **register** → Expected: returns `false`; no error thrown | ✅ | ✅ | 🧪 | |
| `onShortcut` listener | Register shortcut → enable listener → press accelerator (app may be in background) → Expected: event logged with correct event name | ✅ | ✅ | 🧪 | |
| `unregisterShortcut(accelerator)` | After registering → **unregisterShortcut()** → press accelerator → Expected: no event fires | ✅ | ✅ | 🧪 | |
| Preset: CmdOrCtrl+Shift+1 | **Register preset 1** → Expected: shortcut registered; press combo → event logged | ✅ | ✅ | 🧪 | |
| Preset: CmdOrCtrl+Shift+2 | **Register preset 2** → same | ✅ | ✅ | 🧪 | |

### Power Monitor — Playground: **Power tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `onPowerMonitorEvent` — suspend | Power → **enable listener** → put machine to sleep → wake → Expected: `suspend` event logged | 🧪 | 🧪 | 🧪 | |
| `onPowerMonitorEvent` — resume | (continued from above) → Expected: `resume` event logged on wake | 🧪 | 🧪 | 🧪 | |
| `onPowerMonitorEvent` — lock-screen | Power → enable listener → lock screen → Expected: `lock-screen` event logged | 🧪 | 🧪 | 🧪 | Linux: depends on DE / screensaver |
| `onPowerMonitorEvent` — unlock-screen | After lock → unlock → Expected: `unlock-screen` event logged | 🧪 | 🧪 | 🧪 | |
| `onPowerMonitorEvent` — on-battery | Enable listener → unplug power adapter → Expected: `on-battery` event | 🧪 | 🧪 | 🧪 | Desktop machines without battery: not testable |
| `onPowerMonitorEvent` — on-ac | Plug power adapter back in → Expected: `on-ac` event | 🧪 | 🧪 | 🧪 | |
| `onPowerMonitorEvent` — shutdown | Enable listener → initiate system shutdown → Expected: `shutdown` event fires before app exits | 🧪 | 🧪 | 🧪 | |
| Toggle listener off | Power → **disable listener** → trigger power event → Expected: no new events logged | 🧪 | 🧪 | 🧪 | |
| `getPowerMonitorIdleState(threshold)` | Power → enter threshold (e.g. `30`) → **getIdleState()** → Expected: `'active'`, `'idle'`, or `'locked'` | 🧪 | 🧪 | 🧪 | |
| `getPowerMonitorIdleTime()` | Power → **getIdleTime()** → Expected: integer seconds since last user input; positive if idle | 🧪 | 🧪 | 🧪 | |
| `startPowerSaveBlocker('prevent-app-suspension')` | Power → select type → **start blocker** → Expected: returns numeric `id`; `isPowerSaveBlockerStarted(id)` returns `true` | 🧪 | 🧪 | 🧪 | |
| `startPowerSaveBlocker('prevent-display-sleep')` | Select type → **start blocker** → Expected: returns `id`; system display should not auto-sleep while active | 🧪 | 🧪 | 🧪 | Verify by observing display-sleep behaviour |
| `isPowerSaveBlockerStarted(id)` | After `startPowerSaveBlocker()` → **isPowerSaveBlockerStarted(id)** → Expected: `true`; invalid `id` → `false` | 🧪 | 🧪 | 🧪 | |
| `stopPowerSaveBlocker(id)` | After start → **stop blocker** → `isPowerSaveBlockerStarted(id)` → Expected: `false` | 🧪 | 🧪 | 🧪 | |

### Screen / Display — Playground: **Screen tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `getAllDisplays()` | Screen → **getAllDisplays()** → Expected: array of display objects; single-monitor: 1 item; multi-monitor: N items | 🧪 | 🧪 | 🧪 | |
| `getPrimaryDisplay()` | Screen → **getPrimaryDisplay()** → Expected: single display object | 🧪 | 🧪 | 🧪 | |
| `getCursorScreenPoint()` | Move cursor to a known position → **getCursorScreenPoint()** → Expected: `{ x, y }` reflecting cursor position | 🧪 | 🧪 | 🧪 | |
| `getCursorDisplay()` | On multi-monitor setup, move cursor to secondary display → **getCursorDisplay()** → Expected: display object for the screen containing cursor | 🧪 | 🧪 | 🧪 | Meaningful only with multiple monitors |
| `onScreenEvent` — display-added | Screen → **enable listener** → connect external display → Expected: `display-added` event with new display info | 🧪 | 🧪 | 🧪 | Requires ability to connect external monitor |
| `onScreenEvent` — display-removed | With external display → enable listener → disconnect → Expected: `display-removed` event | 🧪 | 🧪 | 🧪 | |
| `onScreenEvent` — display-metrics-changed | Enable listener → change display resolution or scaling → Expected: `display-metrics-changed` event | 🧪 | 🧪 | 🧪 | |
| Toggle listener off | Screen → **disable listener** → reconnect monitor → Expected: no new events logged | 🧪 | 🧪 | 🧪 | |

### Deep Links — Playground: **Deep links tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `onDeepLink` — warm instance | Deep links → **enable listener** → while app is running, execute `open "capelectron://test/path"` in terminal → Expected: URL logged in listener callback | ✅ | ✅ | 🧪 | Windows: packaged build required · Linux: depends on DE |
| `onDeepLink` — cold start | Quit app → execute deep-link command → Expected: app launches; `onDeepLink` fires with URL | ✅ | ✅ | 🧪 | |
| `App.getLaunchUrl()` — first call after deep link | Cold start via deep link → App tab → **getLaunchUrl()** → Expected: `{ url: "capelectron://…" }` | ✅ | ✅ | 🧪 | |
| `App.getLaunchUrl()` — second call (consumed) | Call `getLaunchUrl()` a second time → Expected: `null` (URL consumed on first call) | ✅ | ✅ | 🧪 | |
| `App.getLaunchUrl()` — normal launch | Launch without deep link → getLaunchUrl() → Expected: `null` | ✅ | ✅ | 🧪 | |
| Editable scheme input | Deep links → change scheme input → Expected: displayed test commands update to use the new scheme | ✅ | ✅ | 🧪 | Scheme must match `app.deepLinkingScheme` in `capacitor.config.ts` |
| `appUrlOpen` Capacitor event | App tab → enable Events → trigger deep link while app running → Expected: `appUrlOpen` event with `{ url }` (Capacitor-layer equivalent of `onDeepLink`) | ✅ | ✅ | 🧪 | |

### Native Menus — Playground: **Native menus tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| App menu — custom items | Native menus → **enable onMenuAction listener** → click a custom item in the app menu bar → Expected: `onMenuAction` event with item `id` and `source: 'app'` | ❌ | ✅ | 🧪 | macOS: currently not working |
| App menu — Edit submenu shortcuts | Use Edit menu shortcuts (Undo Cmd+Z, Cut, Copy, Paste) in a text input → Expected: actions apply | ❌ | ✅ | 🧪 | macOS: currently not working |
| `showContextMenu()` — by element id | Menus → enable listener → **showContextMenu by element id** → Expected: context menu appears at element; click item → `onMenuAction` fires with item `id` | 🧪 | 🧪 | 🧪 | |
| `showContextMenu()` — by class + dataset | **showContextMenu by class + data-menu-id** → Expected: correct menu shown for matched element | 🧪 | 🧪 | 🧪 | |
| `showContextMenu()` — at cursor | **showContextMenu at cursor** → Expected: menu appears at current mouse position | 🧪 | 🧪 | 🧪 | |
| `showContextMenu()` — returns false on Escape | Show menu → press Escape → Expected: returns `false`; no `onMenuAction` event | 🧪 | 🧪 | 🧪 | |
| Right-click context menu trigger | Right-click on a page element → Expected: context menu shown; `onMenuAction` event has `trigger: 'right-click'` | 🧪 | 🧪 | 🧪 | |
| Tray icon — visible | Launch app with tray configured → Expected: icon visible in system tray / menu bar | 🧪 | ⚠️ | 🧪 | Windows: icon not showing currently · Linux: depends on DE |
| Tray tooltip | Hover tray icon → Expected: tooltip text visible | 🧪 | 🧪 | 🧪 | |
| minimizeToTray | Close main window with `minimizeToTray: true` → Expected: window hides; tray icon remains; app not quit | 🧪 | 🧪 | 🧪 | |
| Tray menu item → onMenuAction | Click tray menu item → Expected: `onMenuAction` event with `source: 'tray'` | 🧪 | 🧪 | 🧪 | |
| Dock menu visible | Right-click app in macOS Dock → Expected: custom dock items shown | 🧪 | — | — | macOS only |
| Dock menu → onMenuAction | Click dock menu item → Expected: `onMenuAction` fires with `source: 'dock'` | 🧪 | — | — | macOS only |

### Auto Updater — Playground: **Updater tab**

*Prerequisite: packaged app with valid electron-updater feed configured. Dev mode is a deliberate no-op.*

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `checkForUpdate()` | Updater → **checkForUpdate()** → Expected: `checking-for-update` event; then `update-available` or `update-not-available` | 🧪 | 🧪 | 🧪 | |
| `update-available` event | Feed has newer version → Expected: `update-available` event with `UpdateInfo` (`version`, `releaseNotes`) | 🧪 | 🧪 | 🧪 | |
| `update-not-available` event | Feed has same/older version → Expected: `update-not-available` event | 🧪 | 🧪 | 🧪 | |
| `downloadUpdate()` | After `update-available` → **downloadUpdate()** → Expected: `download-progress` events; then `update-downloaded` | 🧪 | 🧪 | 🧪 | |
| `download-progress` event | During download → Expected: repeated events with `{ bytesPerSecond, percent, transferred, total }` | 🧪 | 🧪 | 🧪 | |
| `update-downloaded` event | After download completes → Expected: `update-downloaded` event fires | 🧪 | 🧪 | 🧪 | |
| `quitAndInstall()` | After `update-downloaded` → **quitAndInstall()** → Expected: app quits; installer / updater runs | 🧪 | 🧪 | 🧪 | |
| `error` event | Provide invalid feed URL → **checkForUpdate()** → Expected: `error` event with error message | 🧪 | 🧪 | 🧪 | |
| Bridge absent when disabled | `app.autoUpdater.enabled: false` in config → Electron Info → Expected: updater bridge shown as absent | 🧪 | 🧪 | 🧪 | |

---

## Capacitor Plugins

### App — Playground: **App tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `getInfo()` | App → **getInfo()** → Expected: `{ id, name, build, version }` matching app metadata | ✅ | ✅ | 🧪 | |
| `getState()` | App → **getState()** → Expected: `{ isActive: true }` when window focused; click away → `{ isActive: false }` | ✅ | ✅ | 🧪 | |
| `getLaunchUrl()` — normal launch | App → **getLaunchUrl()** on normal launch → Expected: `null` | ✅ | ✅ | 🧪 | |
| `getLaunchUrl()` — after deep link | Cold start via deep link → **getLaunchUrl()** → Expected: `{ url: "scheme://…" }` on first call; `null` on second call | ✅ | ✅ | 🧪 | |
| `getAppLanguage()` | App → **getAppLanguage()** → Expected: `{ value: "<lang>" }` — two-letter BCP 47 language code from OS locale (e.g. `"en"`, `"cs"`, `"de"`) | 🧪 | 🧪 | 🧪 | |
| `minimizeApp()` | App → **minimizeApp()** → Expected: window minimises to Dock / taskbar | ✅ | ✅ | 🧪 | |
| `exitApp()` | App → **exitApp()** → Expected: application exits completely | ✅ | ✅ | 🧪 | |
| `appStateChange` event | App → **enable Events** → switch to another app → Expected: `{ isActive: false }` event; switch back → `{ isActive: true }` | ✅ | ✅ | 🧪 | |
| `resume` event | Enable Events → focus app after blur → Expected: `resume` event | ✅ | ✅ | 🧪 | |
| `pause` event | Enable Events → click away (blur window) → Expected: `pause` event | ✅ | ✅ | 🧪 | |
| `appUrlOpen` event | Enable Events → trigger deep link while app running → Expected: `appUrlOpen` event with `{ url }` | ✅ | ✅ | 🧪 | Requires `app.deepLinkingScheme` in config |
| `backButton` event (no-op) | Enable Events → Expected: listener attached without error; no `backButton` events fire naturally on desktop | ✅ | ✅ | 🧪 | Desktop no-op — meaningful on Android only |

### Action Sheet — Playground: **Action sheet tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `showActions()` — normal buttons | Action sheet → add buttons → **showActions()** → click a button → Expected: native dialog appears; `{ index: N }` returned matching clicked button | ✅ | ✅ | 🧪 | |
| `showActions()` — cancel role | Include a button with role `cancel` → **showActions()** → Expected: cancel button rendered distinctly; selecting it returns its index | ✅ | ✅ | 🧪 | |
| `showActions()` — destructive role | Include a button with role `destructive` → Expected: button styled destructively (red); returns its index | ✅ | ✅ | 🧪 | |
| Dismiss (Escape / click outside) | **showActions()** → press Escape or click outside → Expected: `{ index: <cancelIndex> }` or `{ index: -1 }` | 🧪 | 🧪 | 🧪 | |

### App Launcher — Playground: **App launcher tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `canOpenUrl(url)` — registered scheme | App launcher → enter URL with a scheme matching `deepLinkingScheme` or `appLauncherSchemes` → **canOpenUrl()** → Expected: `{ value: true }` | 🧪 | 🧪 | 🧪 | Requires `deepLinkingScheme` or `appLauncherSchemes` in config |
| `canOpenUrl(url)` — unknown scheme | Enter URL with unregistered scheme → **canOpenUrl()** → Expected: `{ value: false }` | 🧪 | 🧪 | 🧪 | |
| `canOpenUrl(url)` — unsafe scheme | Enter `javascript:alert(1)` → **canOpenUrl()** → Expected: `{ value: false }` (unsafe scheme rejected) | 🧪 | 🧪 | 🧪 | |
| `openUrl(url)` | Enter URL with registered scheme → **openUrl()** → Expected: URL delivered to registered handler; `{ completed: true }` returned | 🧪 | 🧪 | 🧪 | |

### Browser — Playground: **Browser tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `open(url)` | Browser → enter URL → **open()** → Expected: URL opens in system default browser via `shell.openExternal` | 🧪 | 🧪 | 🧪 | |
| `close()` | Browser → **close()** → Expected: returns without error (no-op on desktop — system browser cannot be programmatically closed) | 🧪 | 🧪 | 🧪 | |
| `getSnapshot()` | Browser → **getSnapshot()** → Expected: returns `null` (no WebView snapshot available on desktop) | 🧪 | 🧪 | 🧪 | |

### Clipboard — Playground: **Clipboard tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `write({ string })` | Clipboard → enter text → **write string** → **read string** → Expected: returned value matches written text | 🧪 | 🧪 | 🧪 | |
| Cross-app paste after write | After write → paste in external text editor → Expected: written text appears | 🧪 | 🧪 | 🧪 | |
| `write({ url })` / `read url` | Clipboard → **write URL text** → **read URL text** → Expected: URL string round-trips correctly | 🧪 | 🧪 | 🧪 | |
| `write({ image })` | Clipboard → enter image data URL → **write image** → Expected: no error | 🧪 | 🧪 | 🧪 | |
| `read()` — image | After writing image → **read image** → Expected: `{ image: "<data URL>" }` with image content | 🧪 | 🧪 | 🧪 | Image paste to native apps varies by OS |

### Device — Playground: **Device tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `getInfo()` | Device → **getInfo()** → Expected: `{ name, model, platform: 'electron', operatingSystem, osVersion, manufacturer, isVirtual, memUsed, webViewVersion }` populated | 🧪 | 🧪 | 🧪 | |
| `getId()` | Device → **getId()** → Expected: stable UUID string; same value on repeated calls and across app restarts | 🧪 | 🧪 | 🧪 | |
| `getLanguageCode()` | Device → **getLanguageCode()** → Expected: two-letter code (e.g. `"en"`) from OS locale | 🧪 | 🧪 | 🧪 | |
| `getLanguageTag()` | Device → **getLanguageTag()** → Expected: full BCP 47 tag (e.g. `"en-US"`) | 🧪 | 🧪 | 🧪 | |
| `getBatteryInfo()` | Device → **getBatteryInfo()** → Expected: `{ batteryLevel, isCharging }` — desktop may return partial data or defaults | 🧪 | 🧪 | 🧪 | Machines without battery: partial or empty result |

### Dialog — Playground: **Dialog tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `alert(message)` | Dialog → **alert()** → Expected: native alert; clicking OK resolves promise | ✅ | ✅ | 🧪 | |
| `confirm(message)` — OK | Dialog → **confirm()** → click OK → Expected: `{ value: true }` | ✅ | ✅ | 🧪 | |
| `confirm(message)` — Cancel | Dialog → **confirm()** → click Cancel → Expected: `{ value: false }` | ✅ | ✅ | 🧪 | |
| `prompt(message)` | Dialog → **prompt()** → Expected: documented no-op result (`{ value: '', cancelled: true }` or similar) | ✅ | ✅ | 🧪 | `prompt()` is unsupported in Electron's dialog API — documented no-op |

### File Transfer — Playground: **File transfer tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `downloadFile(url, path)` | File transfer → enter URL + absolute destination path → **downloadFile()** → Expected: file saved at path; `{ path }` returned | 🧪 | 🧪 | 🧪 | |
| `downloadFile` — progress events | Download a large file → Expected: `progress` events with `{ bytes, contentLength, completed }` during transfer | 🧪 | 🧪 | 🧪 | |
| `uploadFile(url, options)` | Enter endpoint URL + local file path → **uploadFile()** → Expected: file POSTed; response metadata returned | 🧪 | 🧪 | 🧪 | Requires a test endpoint that accepts uploads |

### File Viewer — Playground: **File viewer tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `openDocumentFromLocalPath(path)` | File viewer → enter absolute file path → **openDocumentFromLocalPath()** → Expected: file opens in OS default app (e.g. PDF → Preview / Acrobat) | 🧪 | 🧪 | 🧪 | Uses `shell.openPath` |
| `openDocumentFromUrl(url)` | Enter file URL or HTTP URL → **openDocumentFromUrl()** → Expected: downloaded and opened; or `file://` URL opened directly | 🧪 | 🧪 | 🧪 | |
| `openDocumentFromResources(fileName)` | Enter bundled resource name → **openDocumentFromResources()** → Expected: bundled file opened in default app | 🧪 | 🧪 | 🧪 | |
| Preview aliases | `previewFileFromLocalPath` / `previewFileFromUrl` → Expected: identical behaviour to corresponding `openDocument*` methods | 🧪 | 🧪 | 🧪 | Aliases — same implementation |

### Filesystem — Playground: **Filesystem tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `writeFile()` | Filesystem → enter path + content → **writeFile()** → `readFile()` → Expected: content round-trips correctly | ✅ | ✅ | 🧪 | |
| `writeFile()` — recursive | Enter nested path not yet created → enable recursive → **writeFile()** → Expected: parent directories auto-created | ✅ | ✅ | 🧪 | |
| `appendFile()` | Write file → **appendFile()** with additional content → `readFile()` → Expected: both strings concatenated | ✅ | ✅ | 🧪 | |
| `readFile()` — existing | **readFile()** on written file → Expected: content returned as string or base64 | ✅ | ✅ | 🧪 | |
| `readFile()` — nonexistent | **readFile()** on missing path → Expected: error / rejection (not silent) | ✅ | ✅ | 🧪 | |
| `stat()` | Filesystem → **stat()** on existing file → Expected: `{ type: 'file', size, mtime, uri }` | ✅ | ✅ | 🧪 | |
| `getUri()` | Filesystem → **getUri()** → Expected: absolute `file://` URI for the path + directory combination | ✅ | ✅ | 🧪 | |
| `deleteFile()` | Create file → **deleteFile()** → `stat()` → Expected: stat throws / rejects (file gone) | ✅ | ✅ | 🧪 | |
| `mkdir()` | Enter directory path → **mkdir()** → `readdir()` → Expected: directory appears in listing | ✅ | ✅ | 🧪 | |
| `mkdir()` — recursive | Enter nested path → enable recursive → **mkdir()** → Expected: all intermediate directories created | ✅ | ✅ | 🧪 | |
| `readdir()` | Create files in directory → **readdir()** → Expected: array of file/dir entries | ✅ | ✅ | 🧪 | |
| `rmdir()` — recursive | Create directory with files → enable recursive → **rmdir()** → Expected: directory and all contents removed | ✅ | ✅ | 🧪 | |
| `rename()` | Create file → **rename()** to new path → Expected: file at new path; original path gone | ✅ | ✅ | 🧪 | |
| `copy()` | Create file → **copy()** to new path → Expected: both original and copy exist with identical content | ✅ | ✅ | 🧪 | |
| Directory: `DOCUMENTS` | Select DOCUMENTS → write/read → Expected: file in system Documents folder | ✅ | ✅ | 🧪 | |
| Directory: `DATA` (userData) | Select DATA → Expected: file in Electron `userData` directory | ✅ | ✅ | 🧪 | |
| Directory: `LIBRARY` | Select LIBRARY → Expected: file in Application Support / Library directory | ✅ | ✅ | 🧪 | |
| Directory: `CACHE` | Select CACHE → Expected: file in system cache directory | ✅ | ✅ | 🧪 | |
| Directory: `EXTERNAL` / `EXTERNAL_STORAGE` | Select EXTERNAL → Expected: file in Documents (mapped on desktop) | ✅ | ✅ | 🧪 | |
| Directory: absolute path | Select `(absolute path)` → enter full path in path field → Expected: operates on the exact absolute path without any directory prefix | ✅ | ✅ | 🧪 | |

### In-App Browser — Playground: **In-app browser tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `openInWebView()` — basic | IAB → enter URL → **openInWebView()** → Expected: new BrowserWindow opens and loads URL | 🧪 | 🧪 | 🧪 | |
| Window width / height | Set width + height → **openInWebView()** → Expected: window opens at specified dimensions | 🧪 | 🧪 | 🧪 | |
| Window minWidth / minHeight | Set min dimensions → resize window below min → Expected: window resists going below minimum | 🧪 | 🧪 | 🧪 | |
| `title` option | Set window title → **openInWebView()** → Expected: title bar shows custom title | 🧪 | 🧪 | 🧪 | |
| `alwaysOnTop` | Enable → **openInWebView()** → Expected: window stays above all other windows | 🧪 | 🧪 | 🧪 | |
| `modal` | Enable → **openInWebView()** → Expected: window is modal to parent (blocks interaction with parent window) | 🧪 | 🧪 | 🧪 | |
| `resizable: false` | Disable resizable → **openInWebView()** → Expected: window cannot be resized by dragging | 🧪 | 🧪 | 🧪 | |
| `fullscreenable: false` | Disable → Expected: fullscreen button greyed out / absent | 🧪 | 🧪 | 🧪 | |
| `closable: false` | Disable → Expected: close button greyed out / absent (macOS) | 🧪 | — | 🧪 | macOS: traffic-light close greyed out |
| `movable: false` | Disable → Expected: window cannot be dragged to a new position | 🧪 | 🧪 | 🧪 | |
| `titleBarStyle: 'hidden'` | Select hidden → **openInWebView()** → Expected: no visible title bar; content extends to top edge | 🧪 | — | — | macOS only |
| `titleBarStyle: 'hiddenInset'` | Select hiddenInset → Expected: traffic-light buttons inset over content; no title bar background | 🧪 | — | — | macOS only |
| `backgroundColor` | Set hex colour → Expected: window background shows colour while page loads | 🧪 | 🧪 | 🧪 | |
| `opacity` | Set opacity (e.g. `0.5`) → Expected: window semi-transparent | 🧪 | 🧪 | 🧪 | |
| Session `partition` | Enter custom partition string → **openInWebView()** → Expected: window uses isolated session (cookies/storage separate from main) | 🧪 | 🧪 | 🧪 | |
| Session `clearCache` | Enable clearCache → **openInWebView()** → Expected: session cache cleared on open | 🧪 | 🧪 | 🧪 | |
| Session `clearStorage` | Enable clearStorage → Expected: session storage cleared on open | 🧪 | 🧪 | 🧪 | |
| Custom user agent | Enter UA string → **openInWebView()** → verify in Network tab of IAB DevTools → Expected: requests carry custom UA | 🧪 | 🧪 | 🧪 | |
| Toolbar shown | Enable showToolbar → Expected: toolbar visible in IAB window | 🧪 | 🧪 | 🧪 | |
| Toolbar hidden | Disable showToolbar → Expected: no toolbar | 🧪 | 🧪 | 🧪 | |
| URL label in toolbar | Toggle showURL → Expected: URL shown / hidden in toolbar | 🧪 | 🧪 | 🧪 | |
| Navigation buttons | Toggle showNavigationButtons → Expected: back/forward buttons visible / hidden | 🧪 | 🧪 | 🧪 | |
| Toolbar position bottom | Enable toolbarBottom → Expected: toolbar rendered at bottom of window | 🧪 | 🧪 | 🧪 | |
| `openExternalLinksInSystemBrowser` | Enable option → open page with external links → click link → Expected: opens in system browser, not inside IAB | 🧪 | 🧪 | 🧪 | |
| `browserClosed` event | Open IAB → close window manually → Expected: `browserClosed` event logged | 🧪 | 🧪 | 🧪 | |
| `browserPageLoaded` event | Open URL → Expected: `browserPageLoaded` fires when page finishes loading | 🧪 | 🧪 | 🧪 | |
| `browserPageNavigationCompleted` event | Open URL → navigate to another page inside IAB → Expected: event with new URL | 🧪 | 🧪 | 🧪 | |
| `close()` | Open IAB → **close()** → Expected: IAB window closes | 🧪 | 🧪 | 🧪 | |
| `removeAllListeners()` | Open IAB → **removeAllListeners()** → close window → Expected: no events logged | 🧪 | 🧪 | 🧪 | |
| `openInSystemBrowser(url)` | IAB → **openInSystemBrowser()** → Expected: URL opens in system default browser | 🧪 | 🧪 | 🧪 | Uses `shell.openExternal` |
| `openInExternalBrowser(url)` | IAB → **openInExternalBrowser()** → Expected: same as system browser | 🧪 | 🧪 | 🧪 | |

### Local Notifications — Playground: **Notifications tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `checkPermissions()` | Notifications → **checkPermissions()** → Expected: `{ display: 'granted' \| 'denied' \| 'prompt' }` | 🧪 | ✅ | 🧪 | Unsigned builds may show `denied` on macOS |
| `requestPermissions()` | When not yet granted → **requestPermissions()** → Expected: OS permission dialog; returns `granted` or `denied` | 🧪 | ✅ | 🧪 | |
| `areEnabled()` | Notifications → **areEnabled()** → Expected: `{ value: true }` if system notifications are on for the app | 🧪 | ✅ | 🧪 | |
| `schedule()` — immediate | Fill payload (title, body) → **schedule() now** → Expected: notification shown immediately in OS notification centre | 🧪 | ✅ | 🧪 | |
| `schedule()` — delayed (at) | Set delay (e.g. 3000 ms) → **schedule at +Nms** → wait → Expected: notification appears after delay | 🧪 | ✅ | 🧪 | |
| `schedule()` — repeating | **schedule(every: second, count: 5, repeats: true)** → Expected: notification fires approximately 5 times at 5-second intervals | 🧪 | 🧪 | 🧪 | |
| `schedule()` — silent flag | Enable silent → schedule → Expected: notification shown without sound | 🧪 | 🧪 | 🧪 | |
| `schedule()` — extra payload | Set extra JSON → schedule → `localNotificationReceived` event → Expected: `notification.extra` matches set JSON | 🧪 | 🧪 | 🧪 | |
| `localNotificationReceived` event | Enable Events → schedule notification → Expected: event fired with full notification data | 🧪 | ✅ | 🧪 | |
| `localNotificationActionPerformed` event | Tap a notification action button → Expected: event fired with `notification` + `actionId` | 🧪 | 🧪 | 🧪 | |
| `getPending()` | Schedule delayed notification → **getPending()** before it fires → Expected: array contains pending item | 🧪 | 🧪 | 🧪 | |
| `cancel(id)` | Schedule delayed → getPending → **cancel(id)** → Expected: notification not shown; not in getPending() | 🧪 | 🧪 | 🧪 | |
| `getDeliveredNotifications()` | After notification shown → **getDeliveredNotifications()** → Expected: array contains delivered item | 🧪 | 🧪 | 🧪 | |
| `removeDeliveredNotifications(id)` | getDeliveredNotifications → pick id → **removeDeliveredNotifications** → Expected: item removed from OS notification centre | 🧪 | 🧪 | 🧪 | |
| `removeAllDeliveredNotifications()` | After multiple delivered → **removeAllDelivered()** → Expected: notification centre cleared | 🧪 | 🧪 | 🧪 | |
| `registerActionTypes()` | **registerActionTypes(id, actions)** → schedule notification with that `actionTypeId` → Expected: notification shows action buttons | 🧪 | 🧪 | 🧪 | |
| Channel APIs (Android only) | `createChannel` / `listChannels` / `deleteChannel` | — | — | — | **Android only** — throws or no-ops on desktop |
| Exact notification settings (Android only) | `checkExactNotificationSetting` / `changeExactNotificationSetting` | — | — | — | **Android 13+ only** — throws or no-ops on desktop |

### Network — Playground: **Network tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `getStatus()` | Network → **getStatus()** → Expected: `{ connected: true, connectionType: 'none' \| 'unknown' }` | 🧪 | 🧪 | 🧪 | `connectionType` does not distinguish ethernet/wifi on desktop |
| `networkStatusChange` — disconnect | Network → **enable listener** → disable network adapter → Expected: `{ connected: false, … }` event | 🧪 | 🧪 | 🧪 | |
| `networkStatusChange` — reconnect | Re-enable adapter → Expected: `{ connected: true, … }` event | 🧪 | 🧪 | 🧪 | |
| Toggle listener off | Network → **disable listener** → disconnect → Expected: no new events logged | 🧪 | 🧪 | 🧪 | |

### Preferences — Playground: **Preferences tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `set(key, value)` | Preferences → enter key + value → **set()** → Expected: no error | ✅ | ✅ | 🧪 | |
| `get(key)` existing | After `set()` → **get(same key)** → Expected: returns stored value | ✅ | ✅ | 🧪 | |
| `get(key)` nonexistent | **get()** on unknown key → Expected: `{ value: null }` | ✅ | ✅ | 🧪 | |
| `remove(key)` | After `set()` → **remove(key)** → `get(key)` → Expected: `{ value: null }` | ✅ | ✅ | 🧪 | |
| `clear()` | Store multiple keys → **clear()** → `keys()` → Expected: empty array | ✅ | ✅ | 🧪 | |
| `keys()` | After storing N entries → **keys()** → Expected: array with all key names | ✅ | ✅ | 🧪 | |
| Persistence across restarts | `set(key, value)` → quit & relaunch → `get(key)` → Expected: value still present | ✅ | ✅ | 🧪 | Stored as JSON via electron-store in userData |
| `capacitorPlugins.preferences: false` mode | Set `capacitorPlugins: { preferences: false }` in `capacitor.config.ts` → restart → `set(key, value)` → quit & relaunch → `get(key)` → Expected: `{ value: null }` (data NOT persisted — localStorage cleared between launches) | 🧪 | 🧪 | 🧪 | Config change required; `localStorage` backend is a web-compatibility fallback only |

### Privacy Screen — Playground: **Privacy tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `enable()` | Privacy → **enable()** → Expected: no error; `isEnabled()` returns `true` | 🧪 | 🧪 | 🧪 | Advisory — actual capture prevention depends on OS / window manager |
| `isEnabled()` after enable | Privacy → **isEnabled()** → Expected: `true` | 🧪 | 🧪 | 🧪 | |
| `disable()` | After `enable()` → **disable()** → `isEnabled()` → Expected: `false` | 🧪 | 🧪 | 🧪 | |
| Actual capture prevention | `enable()` → attempt screen capture (Screenshot tool / OBS) → Expected: window content blacked out or excluded from capture | 🧪 | 🧪 | 🧪 | Advisory on macOS / Linux; more reliable on Windows |

### Toast — Playground: **Toast tab**

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `show()` — short duration | Toast → **show(short)** → Expected: OS notification-style toast appears briefly then auto-dismisses | 🧪 | ✅ | 🧪 | |
| `show()` — long duration | Toast → **show(long)** → Expected: toast visible for longer period | 🧪 | ✅ | 🧪 | |
| `show()` — position top | Toast → **show(position: top)** → Expected: toast anchored at top of screen | 🧪 | 🧪 | 🧪 | Position mapping depends on OS notification system |
| `show()` — position center | **show(position: center)** → Expected: toast at centre | 🧪 | 🧪 | 🧪 | |
| `show()` — position bottom | **show(position: bottom)** → Expected: toast at bottom | 🧪 | ✅ | 🧪 | |

---

## Configuration & Infrastructure

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| Splash screen — image | Set `ui.splashScreen.imageSource` → launch app → Expected: splash image displayed while app loads | ✅ | ✅ | 🧪 | |
| Splash screen — backgroundColor | Set `ui.splashScreen.backgroundColor` (hex) → launch → Expected: background colour fills area behind / around splash image | ✅ | ✅ | 🧪 | |
| Splash screen — minDisplayTime | Set `ui.splashScreen.minDisplayTime: 2000` → launch → Expected: splash visible for at least 2 seconds even if app loads faster | ✅ | ✅ | 🧪 | |
| Window state persistence — size | Set `app.persistWindowState: true` → resize window → quit → relaunch → Expected: window reopens at same size | ✅ | ❌ | 🧪 | Windows: not working |
| Window state persistence — position | Resize and move → quit → relaunch → Expected: window reopens at same screen position | ✅ | ❌ | 🧪 | Windows: not working |
| App icon — installer | Provide `icon.png` (1024 × 1024) → build → Expected: `.icns` used on macOS, `.ico` on Windows, `.png` on Linux in installer and app bundle | 🧪 | 🧪 | 🧪 | |
| App icon — runtime Dock / taskbar | Launch app → Expected: custom icon shown in Dock (macOS) / taskbar (Windows) | 🧪 | 🧪 | 🧪 | |
| Tray icon — runtime | Configure `ui.trayMenu` with icon path → launch → Expected: icon appears in system tray / menu bar | 🧪 | 🧪 | 🧪 | |
| Project-root asset paths | Use leading-slash path in config (e.g. `/assets/icon.png`) → run `npx cap sync update` → Expected: file copied to `electron/assets/`; runtime loads it correctly without path error | ✅ | 🧪 | 🧪 | |
| Plugin settings read | Set values under `plugins.Electron` in `capacitor.config.ts` → run app → Expected: `getElectronConfig()` in main returns configured values | ✅ | ✅ | 🧪 | |
| `capacitorPlugins.preferences: false` | Set `capacitorPlugins: { preferences: false }` → Expected: `@capacitor/preferences` uses `localStorage` (not electron-store); verified by data being lost on app restart | 🧪 | 🧪 | 🧪 | |
| CSP — string | Set `security.contentSecurityPolicy: "default-src 'self'"` → load page → Expected: CSP applied; external resource loads blocked | ✅ | ✅ | 🧪 | |
| CSP — object | Set CSP as `{ "default-src": ["'self'"] }` → Expected: auto-assembled CSP string applied | ✅ | ✅ | 🧪 | |
| CSP — false (disabled) | Set `security.contentSecurityPolicy: false` → Expected: no CSP header; external resources load freely | ✅ | ✅ | 🧪 | Dev only — not recommended for production |
| Single instance lock | Set `app.singleInstance: true` → launch second instance → Expected: second instance exits; first window gains focus | ✅ | ✅ | 🧪 | Required for Windows deep linking |
| `serveMode: 'server'` | Set `app.serveMode: 'server'` → launch → verify URL in DevTools → Expected: app served from `http://127.0.0.1:<port>` instead of `file://` | 🧪 | 🧪 | 🧪 | Enables WebUSB / WebBluetooth; no visual difference |
| Vite dev URL | Set `dev.url` in config → `open` → Expected: Electron loads from that URL | ✅ | ✅ | 🧪 | |
| Electron hot-restart on main change | `open` → edit `electron/dist/main.cjs` → save → Expected: Electron main process restarts; window reloads | ✅ | ✅ | 🧪 | |
| Renderer reload on preload change | `open` → edit `electron/dist/preload.cjs` → save → Expected: renderer reloads automatically | ✅ | ✅ | 🧪 | |
| `window.Electron` bridge | Launch → DevTools console → `window.Electron` → Expected: object with all bridge methods present | ✅ | ✅ | 🧪 | |
| `window._CapElectron` bridge | Launch → DevTools → `window._CapElectron` → Expected: internal Capacitor IPC bridge object present | ✅ | ✅ | 🧪 | |
| Sandbox compatibility | Set `webPreferences.sandbox: true` → launch → Expected: all `window.Electron` bridge functions still work via `contextBridge` | 🧪 | 🧪 | 🧪 | |
| electron-builder — macOS `.dmg` | Build for mac → Expected: `.dmg` mounts; drag to Applications; launches; no Gatekeeper block | 🧪 | — | — | Code signing required for Gatekeeper |
| electron-builder — Windows NSIS | Build for win → Expected: `.exe` NSIS installer runs cleanly; app installs and launches | — | 🧪 | — | |
| electron-builder — Linux AppImage | Build for linux → Expected: AppImage marked executable; launches without system install | — | — | 🧪 | |
| Production packaging smoke test | Packaged app → launch without dev server → Expected: `electron-init.js` loads; dialogs, filesystem, notifications work | ⚠️ | ⚠️ | 🧪 | Installer issues on macOS and Windows |

---

## Template: New Project

| Feature | Steps / Expected | macOS | win | lin | Notes |
|---------|-----------------|-------|-----|-----|-------|
| `template-electron` generation | `npx cap add` on fresh project → Expected: `electron/` created with `src/system/`, `src/user/`, `src/generated/`, `tsconfig.json`, `package.json`, `electron-builder.js` | ✅ | ✅ | 🧪 | |
| `template-plugin` generation | Generate plugin template → Expected: plugin scaffold with correct structure, main/preload entry points, and exports | 🧪 | 🧪 | 🧪 | |
| `src/system/` vs `src/user/` split | Run `upgrade` → Expected: `src/system/` files overwritten; `src/user/` files fully preserved | ✅ | ✅ | 🧪 | |
| `src/generated/` regeneration | Run `sync update` → Expected: `src/generated/` contents regenerated to match installed plugin list | ✅ | ✅ | 🧪 | |
| Hot reload in development | `open` → edit renderer source → Expected: changes reflected without manual restart | ✅ | 🧪 | 🧪 | |
| Production build & packaging | `npm run build` in `electron/` → electron-builder → launch packaged app → Expected: core features work in packaged build | ⚠️ | ⚠️ | 🧪 | Installer issues on both platforms |
