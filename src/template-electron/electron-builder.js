const fs = require('fs');
const path = require('path');

let appId = 'com.example.app';
let appName = 'App';

try {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'capacitor.config.json'), 'utf-8'));
  if (cfg.appId)   appId   = cfg.appId;
  if (cfg.appName) appName = cfg.appName;
} catch {
  console.warn('[electron-builder] capacitor.config.json not found — using defaults. Run: cap-electron sync');
}

const asset = (file) => fs.existsSync(path.join(__dirname, 'assets', file))
  ? path.join(__dirname, 'assets', file)
  : undefined;

// App bundle icon (shown in OS file explorer, installer, Start Menu, Dock).
// electron-builder can convert assets/icon.png for platform package icons.
// Use assets/icon.icns or assets/icon.ico when you need a hand-crafted platform file.
const iconPng  = asset('icon.png');
const iconIcns = asset('icon.icns') ?? iconPng;
const iconIco  = asset('icon.ico')  ?? iconPng;

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId,
  productName: appName,
  directories: {
    output: 'dist-electron',
    buildResources: 'assets',
  },
  files: [
    'dist/**',
    '!dist/**/*.map',
    'capacitor.config.json',
    // assets/ is included so splash image and window icon are available at runtime.
    // See: plugins.Electron.icon and plugins.Electron.splashScreen.image in capacitor.config.json
    'assets/**',
  ],
  extraResources: [
    { from: '../dist', to: 'app', filter: ['**/*'] },
  ],
  mac: {
    category: 'public.app-category.utilities',
    icon: iconIcns,
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
  },
  win: {
    icon: iconIco,
    target: [{ target: 'nsis', arch: ['x64', 'arm64'] }],
    // Keep executable resource editing enabled so electron-builder can write the
    // app icon and metadata into the .exe. This only disables code signing.
    signExecutable: false,
  },
  linux: {
    icon: iconPng,
    target: [{ target: 'AppImage', arch: ['x64'] }],
    category: 'Utility',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};
