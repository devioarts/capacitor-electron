

import type { CapacitorConfig } from '@capacitor/cli';


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
      ui: {
        splashScreen: {
          image:           '/public/assets/splash.svg',
          width:           400,
          height:          280,
          backgroundColor: 'transparent',
          minDisplayTime:  1200,
        },
        menu: {
          editMenu: false,
          viewMenu: true,
        },
        tray: {
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
