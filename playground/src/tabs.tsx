// Central registry of playground tabs, labels, rendered pages, and platform support notes.
import type { ReactNode } from "react";
import type { SupportStatus } from "./components/PlatformSupport.tsx";
import { PageHome }          from "./pages/PageHome.tsx";
import { PageApp }           from "./pages/PageApp.tsx";
import { PageDialog }        from "./pages/PageDialog.tsx";
import { PagePreferences }   from "./pages/PagePreferences.tsx";
import { PageFilesystem }    from "./pages/PageFilesystem.tsx";
import { PageToast }         from "./pages/PageToast.tsx";
import { PageNotifications } from "./pages/PageNotifications.tsx";
import { PageBrowser }       from "./pages/PageBrowser.tsx";
import { PageWindow }        from "./pages/PageWindow.tsx";
import { PageShortcuts }     from "./pages/PageShortcuts.tsx";
import { PageDeepLink }        from "./pages/PageDeepLink.tsx";
import { PagePowerMonitor }    from "./pages/PagePowerMonitor.tsx";
import { PageScreen }          from "./pages/PageScreen.tsx";
import { PageNativeMenus }     from "./pages/PageNativeMenus.tsx";
import { PageActionSheet } from "./pages/PageActionSheet.tsx";
import { PageAppLauncher } from "./pages/PageAppLauncher.tsx";
import { PageCapacitorRuntime } from "./pages/PageCapacitorRuntime.tsx";
import { PageClipboard } from "./pages/PageClipboard.tsx";
import { PageDevice } from "./pages/PageDevice.tsx";
import { PageElectronAutoLaunch } from "./pages/PageElectronAutoLaunch.tsx";
import { PageElectronCapture } from "./pages/PageElectronCapture.tsx";
import { PageElectronDialogs } from "./pages/PageElectronDialogs.tsx";
import { PageElectronDownloads } from "./pages/PageElectronDownloads.tsx";
import { PageElectronInfo } from "./pages/PageElectronInfo.tsx";
import { PageElectronManagedWindows } from "./pages/PageElectronManagedWindows.tsx";
import { PageElectronNativeTheme } from "./pages/PageElectronNativeTheme.tsx";
import { PageElectronPrint } from "./pages/PageElectronPrint.tsx";
import { PageElectronProtocols } from "./pages/PageElectronProtocols.tsx";
import { PageElectronSecureStorage } from "./pages/PageElectronSecureStorage.tsx";
import { PageElectronSession } from "./pages/PageElectronSession.tsx";
import { PageElectronUpdater } from "./pages/PageElectronUpdater.tsx";
import { PageFileTransfer } from "./pages/PageFileTransfer.tsx";
import { PageFileViewer } from "./pages/PageFileViewer.tsx";
import { PageInAppBrowser } from "./pages/PageInAppBrowser.tsx";
import { PageNetwork } from "./pages/PageNetwork.tsx";
import { PagePrivacyScreen } from "./pages/PagePrivacyScreen.tsx";

export type TabItem = {
	id: string;
	label: string;
	page: ReactNode;
	platforms: string[];
	os?: SupportStatus[];
	supportNotes?: ReactNode;
};

export type TabGroup = {
	id: "electron" | "capacitor";
	label: string;
	tabs: TabItem[];
};

const electronOnly = ["Electron Desktop"];
const capacitorAll = ["Electron", "iOS", "Android", "Web"];
const capacitorNativeDesktop = ["Electron", "iOS", "Android"];

const allDesktopOs: SupportStatus[] = [
	{ name: "macOS" },
	{ name: "Windows" },
	{ name: "Linux" },
];

const notificationsOs: SupportStatus[] = [
	{ name: "macOS", level: "partial", note: "Requires OS notification permission; unsigned builds can fail." },
	{ name: "Windows", level: "partial", note: "Depends on Windows notification support and app identity." },
	{ name: "Linux", level: "partial", note: "Depends on desktop notification service availability." },
];

const trayMenuOs: SupportStatus[] = [
	{ name: "macOS", note: "App, context, Dock, and tray menus are available." },
	{ name: "Windows", level: "partial", note: "App, context, and tray menus are available; Dock menu is macOS-only." },
	{ name: "Linux", level: "partial", note: "App and context menus work; tray support depends on desktop environment; Dock menu is macOS-only." },
];

const protocolOs: SupportStatus[] = [
	{ name: "macOS", note: "Deep links can usually be tested in dev." },
	{ name: "Windows", level: "partial", note: "Protocol registration generally requires a packaged build." },
	{ name: "Linux", level: "partial", note: "Depends on desktop environment and packaging integration." },
];

const autoLaunchOs: SupportStatus[] = [
	{ name: "macOS" },
	{ name: "Windows" },
	{ name: "Linux", level: "noop", note: "The current Electron bridge returns false and does not enable auto launch on Linux." },
];

const secureStorageOs: SupportStatus[] = [
	{ name: "macOS", note: "Backed by Keychain through Electron safeStorage." },
	{ name: "Windows", note: "Backed by DPAPI through Electron safeStorage." },
	{ name: "Linux", level: "partial", note: "Depends on a supported secret storage backend; can be unavailable in headless/minimal sessions." },
];

const powerOs: SupportStatus[] = [
	{ name: "macOS", level: "partial", note: "Event availability depends on OS state and permissions." },
	{ name: "Windows", level: "partial", note: "Event availability depends on OS power state." },
	{ name: "Linux", level: "partial", note: "Power and lock events vary by desktop environment." },
];

const shortcutsOs: SupportStatus[] = [
	{ name: "macOS", level: "partial", note: "Registration can fail for OS-reserved accelerators." },
	{ name: "Windows", level: "partial", note: "Registration can fail for OS-reserved accelerators." },
	{ name: "Linux", level: "partial", note: "Registration depends on desktop environment and existing global shortcuts." },
];

const captureOs: SupportStatus[] = [
	{ name: "macOS", level: "partial", note: "Requires Screen Recording permission for useful capture results." },
	{ name: "Windows" },
	{ name: "Linux", level: "partial", note: "Availability depends on display server and desktop environment." },
];

const badgeOs: SupportStatus[] = [
	{ name: "macOS", note: "Dock badge is supported." },
	{ name: "Windows", level: "partial", note: "Taskbar badge support depends on Windows/app identity." },
	{ name: "Linux", level: "partial", note: "Badge support depends on desktop environment." },
];

const privacyOs: SupportStatus[] = [
	{ name: "macOS", level: "partial", note: "Advisory privacy behavior depends on window manager support." },
	{ name: "Windows", level: "partial", note: "Advisory privacy behavior depends on OS/window-manager support." },
	{ name: "Linux", level: "partial", note: "Often advisory or no-op depending on desktop environment." },
];

const updaterOs: SupportStatus[] = [
	{ name: "macOS", level: "partial", note: "Requires packaged app, publishing config, and updater feed." },
	{ name: "Windows", level: "partial", note: "Requires packaged app, publishing config, and updater feed." },
	{ name: "Linux", level: "partial", note: "Requires packaged app, publishing config, and Linux-compatible updater setup." },
];

const browserOs: SupportStatus[] = [
	{ name: "macOS" },
	{ name: "Windows" },
	{ name: "Linux", level: "partial", note: "Window behavior can vary by desktop environment/window manager." },
];

export const tabGroups: TabGroup[] = [
	{
		id: "electron",
		label: "Electron",
		tabs: [
			{ id: "electron-info", label: "Info", page: <PageElectronInfo />, platforms: electronOnly, os: allDesktopOs },
			{ id: "window", label: "Window", page: <PageWindow />, platforms: electronOnly, os: badgeOs, supportNotes: "Window controls are cross-platform; badge support varies by OS." },
			{ id: "managed-windows", label: "Managed windows", page: <PageElectronManagedWindows />, platforms: electronOnly, os: browserOs },
			{ id: "electron-dialogs", label: "Dialogs", page: <PageElectronDialogs />, platforms: electronOnly, os: allDesktopOs },
			{ id: "menus", label: "Native menus", page: <PageNativeMenus />, platforms: electronOnly, os: trayMenuOs },
			{ id: "shortcuts", label: "Shortcuts", page: <PageShortcuts />, platforms: electronOnly, os: shortcutsOs, supportNotes: "Global shortcut registration can fail when another app or the OS already owns the accelerator." },
			{ id: "screen", label: "Screen", page: <PageScreen />, platforms: electronOnly, os: allDesktopOs },
			{ id: "powermonitor", label: "Power", page: <PagePowerMonitor />, platforms: electronOnly, os: powerOs },
			{ id: "secure-storage", label: "Secure storage", page: <PageElectronSecureStorage />, platforms: electronOnly, os: secureStorageOs },
			{ id: "protocols", label: "Protocols", page: <PageElectronProtocols />, platforms: electronOnly, os: protocolOs },
			{ id: "deeplink", label: "Deep links", page: <PageDeepLink />, platforms: electronOnly, os: protocolOs },
			{ id: "session", label: "Session", page: <PageElectronSession />, platforms: electronOnly, os: allDesktopOs },
			{ id: "downloads", label: "Downloads", page: <PageElectronDownloads />, platforms: electronOnly, os: allDesktopOs },
			{ id: "print", label: "Print", page: <PageElectronPrint />, platforms: electronOnly, os: allDesktopOs, supportNotes: "Printer availability and native dialogs depend on the host OS and installed printers." },
			{ id: "capture", label: "Capture", page: <PageElectronCapture />, platforms: electronOnly, os: captureOs },
			{ id: "auto-launch", label: "Auto launch", page: <PageElectronAutoLaunch />, platforms: electronOnly, os: autoLaunchOs },
			{ id: "native-theme", label: "Theme", page: <PageElectronNativeTheme />, platforms: electronOnly, os: allDesktopOs },
			{ id: "updater", label: "Updater", page: <PageElectronUpdater />, platforms: electronOnly, os: updaterOs },
		],
	},
	{
		id: "capacitor",
		label: "Capacitor",
		tabs: [
			{ id: "home", label: "Home", page: <PageHome />, platforms: capacitorAll, os: allDesktopOs },
			{ id: "capacitor-runtime", label: "Runtime", page: <PageCapacitorRuntime />, platforms: capacitorAll, os: allDesktopOs },
			{ id: "app", label: "App", page: <PageApp />, platforms: capacitorAll, os: allDesktopOs, supportNotes: "Desktop lifecycle events are mapped to Electron window/app behavior; backButton is a desktop no-op." },
			{ id: "dialog", label: "Dialog", page: <PageDialog />, platforms: capacitorAll, os: allDesktopOs },
			{ id: "preferences", label: "Preferences", page: <PagePreferences />, platforms: capacitorAll, os: allDesktopOs },
			{ id: "filesystem", label: "Filesystem", page: <PageFilesystem />, platforms: capacitorAll, os: allDesktopOs },
			{ id: "toast", label: "Toast", page: <PageToast />, platforms: capacitorAll, os: notificationsOs },
			{ id: "action-sheet", label: "Action sheet", page: <PageActionSheet />, platforms: capacitorAll, os: allDesktopOs },
			{ id: "notifications", label: "Notifications", page: <PageNotifications />, platforms: capacitorNativeDesktop, os: notificationsOs },
			{ id: "browser", label: "Browser", page: <PageBrowser />, platforms: capacitorAll, os: browserOs },
			{ id: "app-launcher", label: "App launcher", page: <PageAppLauncher />, platforms: capacitorNativeDesktop, os: protocolOs },
			{ id: "in-app-browser", label: "In-app browser", page: <PageInAppBrowser />, platforms: capacitorNativeDesktop, os: browserOs },
			{ id: "device", label: "Device", page: <PageDevice />, platforms: capacitorAll, os: allDesktopOs },
			{ id: "network", label: "Network", page: <PageNetwork />, platforms: capacitorAll, os: allDesktopOs },
			{ id: "clipboard", label: "Clipboard", page: <PageClipboard />, platforms: capacitorAll, os: allDesktopOs },
			{ id: "file-viewer", label: "File viewer", page: <PageFileViewer />, platforms: capacitorNativeDesktop, os: allDesktopOs, supportNotes: "Opening files and URLs is delegated to the host OS default handlers." },
			{ id: "file-transfer", label: "File transfer", page: <PageFileTransfer />, platforms: capacitorNativeDesktop, os: allDesktopOs },
			{ id: "privacy-screen", label: "Privacy", page: <PagePrivacyScreen />, platforms: capacitorNativeDesktop, os: privacyOs },
		],
	},
];

export const tabs: TabItem[] = tabGroups.flatMap((group) => group.tabs);
