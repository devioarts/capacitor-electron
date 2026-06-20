

import type { CapacitorConfig } from '@capacitor/cli';


// @ts-expect-error: generated Electron sources exist after cap-electron sync
import type {ElectronConfig} from "./electron/src";

const config: CapacitorConfig = {
  appId:   'com.devioarts.example.electron',
  appName: 'CapacitorJS Playground',
  webDir:  'dist',
  plugins: {
    Electron: {
      app: {
        deepLinkingScheme: 'capelectron',
        appLauncherSchemes: ['capelectron'],
      },
      browserWindow: {
        width:  1200,
        height: 800,
        center: true,
        icon:   '/public/assets/icon.png',
      },
      security:{
        csp: false
      },
      ui: {
        splashScreen: {
          image:           '/public/assets/splash.svg',
          width:           400,
          height:          280,
          backgroundColor: 'transparent',
          minDisplayTime:  1200,
        },
        appMenu: {
          enabled: true,
          editMenu: false,
          viewMenu: true,
        },
        contextMenu: {
          enabled: true,
        },
        dockMenu: {
          enabled: true,
        },
        trayMenu: {
          enabled:        true,
          icon:           '/public/assets/tray.png',
          tooltip:        'cap-electron playground',
          minimizeToTray: false,
        },
      },
    } as ElectronConfig,
  },
};

export default config;
