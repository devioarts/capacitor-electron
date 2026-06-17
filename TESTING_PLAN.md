# Testing Plan

This plan describes how to manually and semi-automatically test `@devioarts/capacitor-electron` after the feature surface has been expanded. Use it together with [TESTING.md](TESTING.md), which tracks the current platform status.

## Scope

Test these platform targets:

| Platform | Minimum coverage |
|---|---|
| macOS Apple Silicon | Development workflow, production packaging, installed app smoke test |
| macOS Intel | Production package launch, updater/signing checks when available |
| Windows x64 | Development workflow, NSIS installer, tray, window state, protocol registration |
| Windows arm64 | Package build and launch if hardware or VM is available |
| Linux x64 | AppImage launch, tray, secure storage backend, desktop capture, print |

Run every test from a clean sample app and from the included playground when possible.

## Preparation

1. Install dependencies in the repository root:

```bash
npm install
```

2. Build the platform package:

```bash
npm run typecheck
npm run build
npx tsc --project src/template-electron/tsconfig.json --noEmit
```

3. Install and build the playground:

```bash
cd playground
npm install
npm run build
npx cap-electron update
```

4. Launch the playground:

```bash
npx cap-electron open
```

5. In the playground, set the logger sink to `panel` or `both` so each button result is visible.

## CLI Tests

### `cap-electron add`

1. Create a new Capacitor app.
2. Install the local package with `npm install --save-dev file:/absolute/path/to/capacitor-electron`.
3. Run `npx cap-electron add`.
4. Verify that `electron/` exists.
5. Verify that `electron/package.json` has the expected app name.
6. Verify that `electron/capacitor.config.json` exists.
7. Verify that `electron/src/system/generated/*` exists.

Expected result: command exits successfully, installs dependencies, runs update, and either copies web assets or prints a clear copy warning.

### `cap-electron scripts`

1. Run `npx cap-electron scripts`.
2. Check root `package.json`.
3. Re-run the command.

Expected result: `electron:sync`, `electron:copy`, and `electron:open` are added once and existing scripts are not overwritten.

### `copy`, `update`, `sync`

1. Build the web app.
2. Run `npx cap-electron copy`.
3. Verify that `electron/app/` contains the web build.
4. Verify that `electron/app/index.html` includes `/electron-init.js`.
5. Run `npx cap-electron update`.
6. Verify generated plugin files and `electron/capacitor.config.json`.
7. Run `npx cap-electron sync`.

Expected result: copied app launches, generated files are deterministic, and asset paths with leading `/` are copied to `electron/assets/`.

### `open` / `run`

1. Ensure the web dev server is not running.
2. Run `npx cap-electron open`.
3. Verify that the dev server starts.
4. Edit a renderer file and confirm Vite refresh.
5. Edit `electron/preload.ts` and confirm renderer reload.
6. Edit `electron/main.ts` and confirm Electron restart.
7. Press `Ctrl+C`.

Expected result: all child processes exit cleanly.

### `build`

1. Run `npx cap-electron build`.
2. Run platform-specific builds where supported:

```bash
npx cap-electron build mac
npx cap-electron build win
npx cap-electron build linux
```

Expected result: electron-builder creates the expected artifacts and packaged apps launch.

### `upgrade` / `restore`

1. Modify a user file under `electron/src/user`.
2. Modify a system file under `electron/src/system`.
3. Run `npx cap-electron upgrade`.
4. Confirm user files are preserved.
5. Confirm system files are restored from the template.
6. Run `npx cap-electron upgrade --all` in a disposable app.

Expected result: user files are never overwritten; optional files are updated only with `--all`.

## Built-In Capacitor Plugin Tests

Use the playground tabs where possible.

### App

1. Open the `App` tab.
2. Run `getInfo()`, `getState()`, `getLaunchUrl()`.
3. Focus and blur the window while listening for app state events.
4. Test `minimizeApp()`.
5. Test `exitApp()` only at the end.

Expected result: app metadata matches config/package, focus events fire, and minimize/exit work.

### Action Sheet

1. Open `Toast & Sheet`.
2. Trigger a normal action sheet.
3. Trigger cancel and destructive options.

Expected result: native message box appears and returns the selected index.

### App Launcher

1. Open `Browser`.
2. Test `canOpenUrl()` for `https://example.com`.
3. Test a configured custom scheme such as `capelectron://test`.
4. Test an unconfigured unsafe scheme such as `javascript:alert(1)`.

Expected result: web URLs and configured schemes are allowed; unsafe schemes are rejected.

### Browser

1. Open `Browser`.
2. Run `Browser.open()` with `https://example.com`.
3. Run `close()` and `getSnapshot()`.

Expected result: external browser opens; `close()` is a no-op; `getSnapshot()` returns `null`.

### Clipboard

1. Open `Cap Desktop`.
2. Write text and read it back.
3. Write the sample image.
4. Paste into another app that accepts images.

Expected result: text round-trips and image paste works where the OS supports it.

### Device

1. Open `Cap Desktop`.
2. Run `Device.getInfo()`.
3. Run `Device.getId()` twice.
4. Restart the app and run `getId()` again.
5. Run language and battery checks.

Expected result: install id is stable across restarts; language fields are populated; battery may be empty on desktop.

### Dialog

1. Open `Dialog`.
2. Test alert, confirm, and prompt.

Expected result: alert and confirm use native dialogs; prompt returns the documented unsupported result.

### File Transfer

1. Open `Cap Desktop`.
2. Download `https://capacitorjs.com/` to the cache filename.
3. Confirm progress events appear.
4. Use the downloaded file as the upload path.
5. Upload to a test endpoint such as `https://httpbin.org/post`.
6. Test invalid URL and missing file cases.

Expected result: download creates a local file; upload returns response metadata; errors are logged clearly.

### File Viewer

1. Download a test file through File Transfer.
2. Open it with `openDocumentFromLocalPath()`.
3. Open `https://capacitorjs.com/` with `openDocumentFromUrl()`.
4. Test `openDocumentFromResources()` after running `cap-electron copy`.
5. Test preview aliases.

Expected result: OS default apps open local files and URLs. Preview aliases behave like open methods on Electron.

### Filesystem

1. Open `Filesystem`.
2. Test write, append, read, stat, and getUri.
3. Test mkdir, readdir, and rmdir.
4. Test copy and rename.
5. Test invalid path traversal such as `../escape.txt`.

Expected result: valid operations work inside mapped directories; traversal attempts fail.

### Local Notifications

1. Open `Notifications`.
2. Check/request permissions.
3. Schedule an immediate notification.
4. Schedule a delayed notification.
5. Cancel pending notifications.
6. Test action types if supported on the OS.

Expected result: native notification appears and events are logged where supported.

### Network

1. Open `Cap Desktop`.
2. Run `Network.getStatus()`.
3. Enable the listener.
4. Disable network connectivity or switch networks.
5. Re-enable connectivity.

Expected result: status changes are logged. `connectionType` is `none` or `unknown`.

### Preferences

1. Open `Preferences`.
2. Test set/get/remove/keys/clear.
3. Test migration from localStorage if sample keys exist.
4. Restart the app and confirm values persist.

Expected result: values persist in the native JSON store unless cleared.

### Privacy Screen

1. Open `Cap Desktop`.
2. Enable privacy screen.
3. Use OS screenshot and screen recording tools.
4. Disable privacy screen.
5. Repeat in packaged app.

Expected result: `isEnabled()` reflects state. Capture prevention depends on OS support and must be recorded per platform.

### Toast

1. Open `Toast & Sheet`.
2. Show short and long toast variants.
3. Test top, center, and bottom positions if available.

Expected result: toast appears and dismisses without blocking the renderer.

## `window.Electron` API Tests

Use the `Electron+` playground tab.

### Native Dialogs

1. Run `showOpenDialog()`.
2. Select multiple files and cancel once.
3. Run `showSaveDialog()` and cancel once.
4. Run `showMessageBox()`.
5. Run `showErrorBox()`.

Expected result: dialogs are parented to the current window and return expected result objects.

### Secure Storage

1. Run `status()`.
2. Set a key/value.
3. Read it back.
4. Run encrypt/decrypt.
5. Remove the key.
6. Clear the store.
7. Restart and confirm removed values stay removed.

Expected result: values round-trip; Linux backend is recorded, especially `basic_text`.

### Protocols

1. Confirm configured schemes.
2. Check status for `capelectron`.
3. Set as default protocol client.
4. Re-check status.
5. Open `capelectron://test/from-playground`.
6. Remove as default protocol client.

Expected result: configured schemes can be registered; unconfigured schemes are rejected.

### Session

1. Get the user agent.
2. Set a test cookie.
3. Read cookies for the URL.
4. Remove the cookie.
5. Clear cache.
6. Clear storage data.
7. Resolve proxy for a URL.
8. Set proxy rules only with a known-good local proxy, then reset with an empty value.
9. Close all connections.

Expected result: session methods affect only the current Electron session and do not expose raw session objects.

### Downloads

1. Start a large download URL.
2. Confirm `started` and `updated` events.
3. Pause the active download.
4. Resume it.
5. Cancel it.
6. Start a small download and let it complete.
7. Check `getActive()` during and after transfer.

Expected result: active id maps to a real Electron `DownloadItem`; final state is `completed`, `cancelled`, or `interrupted`.

### Print / PDF

1. Run `getPrinters()`.
2. Run `print()` and cancel the native print dialog.
3. Run `printToPDF()` without a path and confirm base64 data is returned.
4. Run `printToPDF()` with an absolute path and open the written file.

Expected result: PDF renders the current page and printer list returns without crashing on systems without printers.

### Desktop Capture

1. Run `getSources()`.
2. Confirm at least one screen source exists.
3. Confirm thumbnails are data URLs.
4. Test with multiple monitors if available.
5. Test screen recording permission prompts on macOS.

Expected result: screen/window sources list is populated according to OS permissions.

### Auto Launch

1. Check settings.
2. Check `isEnabled()`.
3. Enable auto launch.
4. Check OS login items/startup apps.
5. Disable auto launch.

Expected result: setting toggles correctly. Some Linux environments may not support the same behavior.

### Native Theme

1. Run `theme get()`.
2. Set theme to dark.
3. Set theme to system.
4. Change OS theme while listener is active.

Expected result: snapshot and update events reflect Electron `nativeTheme`.

### Managed Windows

1. Create a managed window with an `https` URL.
2. List windows.
3. Focus the created window.
4. Hide and show it.
5. Change bounds.
6. Close it.
7. Try creating a window with a non-HTTP URL.

Expected result: managed windows use safe preload defaults; non-HTTP URLs are rejected; renderer cannot override `webPreferences`.

### Power Monitor

1. Open `Power Monitor`.
2. Start event listener.
3. Lock and unlock the screen.
4. Suspend and resume the machine if practical.
5. Query idle state and idle time.

Expected result: supported OS events arrive; unsupported events are recorded as platform limitations.

### Power Save Blocker

1. Start `prevent-app-suspension`.
2. Confirm returned id is active.
3. Stop it.
4. Start `prevent-display-sleep`.
5. Stop it.

Expected result: blocker ids are tracked and inactive ids return false.

### Screen / Display

1. Open `Screen`.
2. Query all displays.
3. Query primary display.
4. Query cursor point and cursor display.
5. Enable listener.
6. Attach/detach a monitor or change scaling.

Expected result: display information is accurate and change events arrive.

### Shortcuts

1. Open `Shortcuts`.
2. Register a test accelerator.
3. Press it while the app is focused.
4. Press it while another app is focused.
5. Unregister it.
6. Try registering an already-used system shortcut.

Expected result: registered shortcuts emit events globally; unavailable accelerators return false.

### Window Controls

1. Open `Window`.
2. Test minimize, maximize, unmaximize, toggle maximize.
3. Test fullscreen on/off.
4. Test reload.
5. Test devtools open/close in development.

Expected result: current BrowserWindow responds correctly.

## Production Packaging Tests

### Packaged App Smoke

1. Build the web app.
2. Run `npx cap-electron sync`.
3. Run `npx cap-electron build`.
4. Launch the packaged app.
5. Confirm no dev server is required.
6. Confirm `electron-init.js` is loaded.
7. Run the Home, App, Filesystem, Cap Desktop, and Electron+ smoke buttons.

Expected result: packaged app behaves like dev mode, except devtools are closed unless configured.

### Icons and Assets

1. Configure `icon`, `tray.icon`, and `splashScreen.image` with leading project-root paths.
2. Run `cap-electron update`.
3. Verify files are copied into `electron/assets`.
4. Build package.
5. Confirm runtime window icon, tray icon, dock icon, and installer icon.

Expected result: assets are copied once and packaged correctly.

### Deep Linking

1. Configure `deepLinkingScheme`.
2. Build and install packaged app.
3. Open `scheme://test/path` while app is closed.
4. Open another link while app is already running.
5. Check `App.getLaunchUrl()`, `App.addListener('appUrlOpen')`, and `window.Electron.onDeepLink`.

Expected result: cold and warm deep links focus the existing instance and deliver the URL.

### Auto Updater

1. Configure a real electron-updater provider.
2. Build a signed package.
3. Publish an initial version.
4. Launch installed app and check for updates.
5. Publish a higher version.
6. Verify `checking-for-update`, `update-available`, download progress, and `update-downloaded`.
7. Test `quitAndInstall()`.

Expected result: updater events are delivered and installed version changes.

## Security Regression Tests

1. Confirm `contextIsolation: true` and `nodeIntegration: false` in every window.
2. Confirm managed windows cannot override `webPreferences`.
3. Confirm unexpected navigations are blocked.
4. Confirm `window.open` is denied.
5. Confirm permission requests are denied by default.
6. Confirm IPC calls from untrusted origins are rejected.
7. Confirm AppLauncher rejects unsafe schemes.
8. Confirm FileViewer rejects unsupported URL schemes.
9. Confirm FileTransfer rejects invalid URLs and missing paths.
10. Confirm secure storage does not write plaintext values to its JSON store.

## Documentation Checks

1. Verify README option table matches `ElectronConfig`.
2. Verify every built-in Capacitor plugin has a docs page or README section.
3. Verify every `window.Electron.*` namespace is documented in `docs/electron-desktop-apis.md`.
4. Verify TESTING.md contains a row for every supported feature.
5. Verify playground has a manual test path for every feature that can be triggered safely from the renderer.

## Recording Results

For each platform, update [TESTING.md](TESTING.md) using:

- `✅` tested and working
- `⚠️` tested with limitations
- `❌` tested and failing
- `🧪` not tested yet
- `🚧` in progress
- `—` not applicable

When marking `⚠️` or `❌`, include:

- OS version
- CPU architecture
- Electron version
- Capacitor Electron version or commit
- exact command or playground tab
- observed behavior
- expected behavior
- logs/screenshots where useful
