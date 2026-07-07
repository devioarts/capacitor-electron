# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.3.0] - 2026-07-08

### Added
- Added `window.Electron.externalCommands`, a native-process bridge for configured command aliases with argument validation, stdin support, output events, timeouts, and output-size limits.
- Added Electron 43 support in the package and generated Electron template.
- Added integration coverage for the CLI lifecycle and expanded E2E preparation for real generated Electron apps.
- Added focused tests for external commands, file trust, protocol serving, InAppBrowser behavior, managed windows, secure storage, window state, and renderer initialization.
- Added GitHub funding metadata.

### Changed
- Updated the development toolchain to ESLint 10, TypeScript 6, Electron 43, and refreshed lockfiles.
- Split npm test scripts into `test:unit`, `test:integration`, `test:e2e`, and `test:all` so release checks can target the right level of coverage.
- Improved `serveMode: 'protocol'` behavior, including app protocol diagnostics, CSP handling on protocol responses, and safer app-route resolution.
- Improved `Capacitor.convertFileSrc()` support in protocol mode with mapped Capacitor file roots and configurable file-extension access.
- Expanded InAppBrowser Electron options for window sizing, session partitions, cache/storage clearing, navigation behavior, and permission allowlists.
- Improved managed secondary windows so trusted app routes and untrusted external URLs are handled through separate loading paths.
- Improved local notification scheduling/reporting behavior and window state persistence.
- Refreshed README and feature docs for Electron desktop APIs, filesystem protocol access, InAppBrowser, deep linking, CSP, local notifications, platform support, and window state persistence.

### Fixed
- Fixed protocol-mode serving edge cases that could break absolute asset paths, custom protocol responses, or `Capacitor.convertFileSrc()` URLs.
- Fixed external managed-window handling so custom schemes are delegated to the operating system only when explicitly allowed.
- Fixed renderer initialization and plugin bridge error propagation to reject failed calls consistently.
- Fixed secure storage behavior around hashed key mode and unsupported key listing.
- Fixed E2E and CI setup so generated playground apps are prepared before browser tests run.

### Security
- Hardened protocol-mode file serving by separating trusted app assets from user-writable Capacitor file routes.
- Restricted `convertFileSrc()` protocol access to passive media/font/image files by default, with explicit opt-in for additional extensions or all files.
- Kept untrusted external managed windows isolated from the preload bridge and blocked script/data-style URL schemes.
- Added deny-by-default InAppBrowser permission handling, including custom session partitions.
- Implemented external native commands as an allowlisted, no-shell bridge rather than accepting arbitrary renderer-provided commands.

## [0.2.0] - 2026-06-26

### Added
- Added `cap-electron run` / `open` development workflow with dev-server startup, Electron build/watch, and cleanup handling.
- Added `cap-electron build`, `prepare`, `sync`, and richer update/upgrade helpers for generated Electron projects.
- Added native Electron bridge APIs for dialogs, secure storage, protocols, sessions, downloads, printing, desktop capture, auto launch, native theme, managed windows, screen/display, power monitor, power save blocker, process errors, menus, tray, splash screen, updater, and global shortcuts.
- Added native Capacitor plugin implementations for Browser, Clipboard, Device, File Transfer, File Viewer, InAppBrowser, Network, Preferences, and Privacy Screen.
- Added custom app protocol support for production builds that need web-style absolute asset paths.
- Added a full playground app for manual and automated feature validation.
- Added GitHub issue templates, PR template, CI workflow, lint config, Vitest config, Playwright config, mocks, unit tests, and E2E coverage.
- Added feature documentation for desktop APIs, platform support, menus, InAppBrowser, file transfer, file viewer, privacy screen, network, device, clipboard, power save blocker, and testing.

### Changed
- Reworked the Electron template into separate `capacitor-api`, `electron-api`, and `plugins-api` areas.
- Reworked shared bridge/config types so generated projects and package consumers share the same public contracts.
- Improved package metadata generation and plugin auto-registration for third-party Capacitor plugins.
- Improved Electron builder defaults, icon/splash asset handling, app identity handling, and generated config snapshots.
- Improved documentation across README, architecture, icons, CSP, deep linking, filesystem, preferences, updater, tray/menu, splash, and window-state guides.

### Fixed
- Fixed Windows development launch and process cleanup behavior.
- Fixed native menu, tray, protocol, and filesystem edge cases found through playground and unit testing.
- Fixed update/copy/sync helper behavior around project directory detection and generated files.

### Security
- Enforced context isolation, disabled renderer Node integration, and kept preload wiring controlled by the template.
- Added CSP defaults and documentation for development and production serving modes.
- Added safer URL/protocol handling for browser, app launcher, deep links, and managed windows.
- Added native secure storage backed by Electron `safeStorage`.

## [0.1.1] - 2026-06-15

### Added
- Initial release of Capacitor Electron platform.
- CLI commands: `add`, `copy`, `open`, `update`, `upgrade`, `kill`, and `scripts`.
- Support for Electron 42, Capacitor 8, and Vite 8.
- Built-in plugins: App, Action Sheet, App Menu, Auto Updater, Browser, Dialog, Filesystem, Global Shortcuts, Local Notifications, Preferences, Splash Screen, Toast, Tray Menu, and Window State Persistence.
- Templates: `template-electron` and `template-plugin`.
- IPC bridge between Electron main and renderer through the preload script.
- Configuration through `electron-builder.js`.
- Deep linking, Content Security Policy, icons, and assets support.
