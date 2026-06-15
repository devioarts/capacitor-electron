# Feature Testing Tracker

> Version: **0.1.1** | Updated: 2026-06-15

## Legend
- ✅ Tested and working
- ❌ Not tested / failed
- ⚠️ Partially tested / issues found
- 🚧 In progress / not complete

---

## CLI Commands

| Feature | Description | Status | Notes |
|---------|-------------|-------|-------|
| `add` | Add Electron platform to a project | ✅ | |
| `copy` | Copy web assets into the Electron project | ✅ | |
| `open` | Open the project in Electron | ⚠️ | |
| `update` | Update the Electron platform | ✅ | |
| `upgrade` | Upgrade dependencies | ✅ | |
| `kill` | Kill a running process | ✅ | |
| `scripts` | Run project scripts | ✅ | |

---

## Capacitor Plugins / API

| Feature | Docs | Status | Notes |
|---------|------|--------|-------|
| App (lifecycle) | [app.md](docs/app.md) | ❌ |Not tested |
| Action Sheet | [action-sheet.md](docs/action-sheet.md) | ❌ |Not tested |
| App Menu | [app-menu.md](docs/app-menu.md) | ❌ |Not tested |
| Auto Updater | [auto-updater.md](docs/auto-updater.md) | ❌ |Not tested |
| Browser (InAppBrowser) | [browser.md](docs/browser.md) | ❌ |Not tested |
| Dialog | [dialog.md](docs/dialog.md) | ❌ |Not tested |
| Filesystem | [filesystem.md](docs/filesystem.md) | ❌ |Not tested |
| Global Shortcuts | [global-shortcuts.md](docs/global-shortcuts.md) | ❌ |Not tested |
| Local Notifications | [local-notifications.md](docs/local-notifications.md) | ❌ |Not tested |
| Preferences | [preferences.md](docs/preferences.md) | ❌ |Not tested |
| Splash Screen | [splash-screen.md](docs/splash-screen.md) | ✅ | |
| Toast | [toast.md](docs/toast.md) | ❌ |Not tested |
| Tray Menu | [tray-menu.md](docs/tray-menu.md) | ❌ |Not tested |
| Window State Persistence | [window-state-persistence.md](docs/window-state-persistence.md) | ❌ |Not tested |

---

## Configuration & Infrastructure

| Feature | Docs | Status | Notes |
|---------|------|--------|-------|
| Deep Linking | [deep-linking.md](docs/deep-linking.md) | ❌ |Not tested |
| Content Security Policy | [content-security-policy.md](docs/content-security-policy.md) | ❌ |Not tested |
| Icons & Assets | [icons.md](docs/icons.md) | ❌ |Not tested |
| Plugin Settings (shared) | — | ❌ |Not tested |
| Vite build integration | — | ✅ | |
| electron-builder configuration | — | ❌ |Not tested |
| Preload script | — | ✅ | |
| IPC bridge (main ↔ renderer) | — | ❌ |Not tested |

---

## Template: New Project

| Feature | Status | Notes      |
|---------|-------|------------|
| `template-electron` generation | ✅ |            |
| `template-plugin` generation | ❌ | Not tested |
| Generated project structure | ✅ |            |
| Hot reload in development | ❌ | Not tested |
| Production build & packaging | ⚠️ | installer issue |

---

## Platforms

| Platform | Status | Notes |
|----------|------|-------|
| macOS (Intel) | ❌ |Not tested |
| macOS (Apple Silicon) | ✅ | |
| Windows | ✅ | |
| Linux | ❌ |Not tested |
