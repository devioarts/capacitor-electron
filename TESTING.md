# Feature Testing Tracker

> Version: **0.1.1** | Updated: 2026-06-15

## Legend
- ✅ Tested and working
- ❌ Not tested / failed
- ⚠️ Partially tested / issues found
- 🚧 In progress / not complete
- — Not applicable / unknown

**Platforms:** `arm` = macOS Apple Silicon · `x86` = macOS Intel · `win` = Windows · `lin` = Linux

---

## CLI Commands

| Feature | Description | arm | x86 | win | lin | Notes |
|---------|-------------|-----|-----|-----|-----|-------|
| `add` | Add Electron platform to a project | ✅ | — | ✅ | — | |
| `copy` | Copy web assets into the Electron project | ✅ | — | ✅ | — | |
| `open` | Open the project in Electron | ⚠️ | — | ⚠️ | — | |
| `update` | Update the Electron platform | ✅ | — | ✅ | — | |
| `upgrade` | Upgrade dependencies | ✅ | — | ✅ | — | |
| `kill` | Kill a running process | ✅ | — | ✅ | — | |
| `scripts` | Run project scripts | ✅ | — | ✅ | — | |

---

## Capacitor Plugins / API

| Feature | Docs | arm | x86 | win | lin | Notes                          |
|---------|------|---|-----|--|-----|--------------------------------|
| App (lifecycle) | [app.md](docs/app.md) | ✅ | — | ✅ | — |                                |
| Action Sheet | [action-sheet.md](docs/action-sheet.md) | ✅ | — | ✅ | — |                                |
| App Menu | [app-menu.md](docs/app-menu.md) | ❌ | — | ✅ | — | Mac not work                   |
| Auto Updater | [auto-updater.md](docs/auto-updater.md) | ❌ | — | ❌ | — | Not tested                     |
| Browser (InAppBrowser) | [browser.md](docs/browser.md) | ❌ | — | ❌ | — | Not tested                     |
| Dialog | [dialog.md](docs/dialog.md) | ✅ | — | ✅ | — |                     |
| Filesystem | [filesystem.md](docs/filesystem.md) | ✅ | — | ✅ | — |                     |
| Global Shortcuts | [global-shortcuts.md](docs/global-shortcuts.md) | ✅ | — | ✅ | — |                     |
| Local Notifications | [local-notifications.md](docs/local-notifications.md) | ❌ | — | ✅⚠️ | — | On windows caption is electron |
| Preferences | [preferences.md](docs/preferences.md) | ✅ | — | ✅ | — |                                |
| Splash Screen | [splash-screen.md](docs/splash-screen.md) | ✅ | — | ✅ | — |                                |
| Toast | [toast.md](docs/toast.md) | ❌ | — | ✅ | — | Not tested                     |
| Tray Menu | [tray-menu.md](docs/tray-menu.md) | ❌ | — | ✅⚠️ | — | On windows no icon             |
| Window State Persistence | [window-state-persistence.md](docs/window-state-persistence.md) | ✅ | — | ❌ | — | Windows - not working          |

---

## Configuration & Infrastructure

| Feature | Docs | arm | x86 | win | lin | Notes |
|---------|------|----|-----|--|-----|-------|
| Deep Linking | [deep-linking.md](docs/deep-linking.md) | ✅ | — | ✅ | — | Not tested |
| Content Security Policy | [content-security-policy.md](docs/content-security-policy.md) | ✅ | — | ✅ | — | Not tested |
| Icons & Assets | [icons.md](docs/icons.md) | ❌ | — | ❌ | — | Not tested |
| Plugin Settings (shared) | — | ✅ | — | ✅ | — | Not tested |
| Vite build integration | — | ✅ | — | ✅ | — | |
| electron-builder configuration | — | ❌ | — | ❌ | — | Not tested |
| Preload script | — | ✅ | — | ✅ | — | |
| IPC bridge (main ↔ renderer) | — | ✅ | — | ✅ | — |  |

---

## Template: New Project

| Feature | arm | x86 | win | lin | Notes          |
|---------|-----|-----|-----|-----|----------------|
| `template-electron` generation | ✅ | — | ✅ | — |                |
| `template-plugin` generation | ❌ | — | ❌ | — | Not tested     |
| Generated project structure | ✅ | — | ✅ | — |                |
| Hot reload in development | ✅ | — | ❌ | — | Not tested     |
| Production build & packaging | ⚠️ | — | ⚠️ | — | installer issue |
