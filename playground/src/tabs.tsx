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
import { PageDeepLink }      from "./pages/PageDeepLink.tsx";

export type TabItem = {
	id: string;
	label: string;
	page: ReactNode;
};

export const tabs: TabItem[] = [
	{ id: 'home',          label: 'Home',          page: <PageHome /> },
	{ id: 'app',           label: 'App',           page: <PageApp /> },
	{ id: 'dialog',        label: 'Dialog',        page: <PageDialog /> },
	{ id: 'preferences',   label: 'Preferences',   page: <PagePreferences /> },
	{ id: 'filesystem',    label: 'Filesystem',    page: <PageFilesystem /> },
	{ id: 'toast',         label: 'Toast & Sheet', page: <PageToast /> },
	{ id: 'notifications', label: 'Notifications', page: <PageNotifications /> },
	{ id: 'browser',       label: 'Browser',       page: <PageBrowser /> },
	{ id: 'window',        label: 'Window',        page: <PageWindow /> },
	{ id: 'shortcuts',     label: 'Shortcuts',     page: <PageShortcuts /> },
	{ id: 'deeplink',      label: 'Deep Link',     page: <PageDeepLink /> },
];
