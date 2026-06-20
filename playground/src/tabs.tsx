import type { ReactNode } from "react";
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
};

export type TabGroup = {
	id: "electron" | "capacitor";
	label: string;
	tabs: TabItem[];
};

export const tabGroups: TabGroup[] = [
	{
		id: "electron",
		label: "Electron",
		tabs: [
			{ id: "electron-info", label: "Info", page: <PageElectronInfo /> },
			{ id: "window", label: "Window", page: <PageWindow /> },
			{ id: "managed-windows", label: "Managed windows", page: <PageElectronManagedWindows /> },
			{ id: "electron-dialogs", label: "Dialogs", page: <PageElectronDialogs /> },
			{ id: "menus", label: "Native menus", page: <PageNativeMenus /> },
			{ id: "shortcuts", label: "Shortcuts", page: <PageShortcuts /> },
			{ id: "screen", label: "Screen", page: <PageScreen /> },
			{ id: "powermonitor", label: "Power", page: <PagePowerMonitor /> },
			{ id: "secure-storage", label: "Secure storage", page: <PageElectronSecureStorage /> },
			{ id: "protocols", label: "Protocols", page: <PageElectronProtocols /> },
			{ id: "deeplink", label: "Deep links", page: <PageDeepLink /> },
			{ id: "session", label: "Session", page: <PageElectronSession /> },
			{ id: "downloads", label: "Downloads", page: <PageElectronDownloads /> },
			{ id: "print", label: "Print", page: <PageElectronPrint /> },
			{ id: "capture", label: "Capture", page: <PageElectronCapture /> },
			{ id: "auto-launch", label: "Auto launch", page: <PageElectronAutoLaunch /> },
			{ id: "native-theme", label: "Theme", page: <PageElectronNativeTheme /> },
			{ id: "updater", label: "Updater", page: <PageElectronUpdater /> },
		],
	},
	{
		id: "capacitor",
		label: "Capacitor",
		tabs: [
			{ id: "home", label: "Home", page: <PageHome /> },
			{ id: "capacitor-runtime", label: "Runtime", page: <PageCapacitorRuntime /> },
			{ id: "app", label: "App", page: <PageApp /> },
			{ id: "dialog", label: "Dialog", page: <PageDialog /> },
			{ id: "preferences", label: "Preferences", page: <PagePreferences /> },
			{ id: "filesystem", label: "Filesystem", page: <PageFilesystem /> },
			{ id: "toast", label: "Toast", page: <PageToast /> },
			{ id: "action-sheet", label: "Action sheet", page: <PageActionSheet /> },
			{ id: "notifications", label: "Notifications", page: <PageNotifications /> },
			{ id: "browser", label: "Browser", page: <PageBrowser /> },
			{ id: "app-launcher", label: "App launcher", page: <PageAppLauncher /> },
			{ id: "in-app-browser", label: "In-app browser", page: <PageInAppBrowser /> },
			{ id: "device", label: "Device", page: <PageDevice /> },
			{ id: "network", label: "Network", page: <PageNetwork /> },
			{ id: "clipboard", label: "Clipboard", page: <PageClipboard /> },
			{ id: "file-viewer", label: "File viewer", page: <PageFileViewer /> },
			{ id: "file-transfer", label: "File transfer", page: <PageFileTransfer /> },
			{ id: "privacy-screen", label: "Privacy", page: <PagePrivacyScreen /> },
		],
	},
];

export const tabs: TabItem[] = tabGroups.flatMap((group) => group.tabs);
