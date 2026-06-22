const fs = require('fs');
const path = require('path');

let appId = 'com.example.app';
let appName = 'App';
let builderOverrides = {};

try {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'capacitor.config.json'), 'utf-8'));
  if (cfg.appId)   appId   = cfg.appId;
  if (cfg.appName) appName = cfg.appName;
  const electronConfig = cfg.plugins && cfg.plugins.Electron && typeof cfg.plugins.Electron === 'object'
    ? cfg.plugins.Electron
    : {};
  builderOverrides = electronConfig.builder && typeof electronConfig.builder === 'object'
    ? electronConfig.builder
    : {};
} catch {
  console.warn('[electron-builder] capacitor.config.json not found — using defaults. Run: cap-electron sync');
}

const asset = (file) => fs.existsSync(path.join(__dirname, 'assets', file))
  ? path.join(__dirname, 'assets', file)
  : undefined;

const appExecutableName = toSafeFileName(appName, appId);

function toSafeFileName(name, fallback) {
  for (const candidate of [name, fallback, 'app']) {
    const safe = candidate
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/[-._]{2,}/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 214);

    if (safe) return safe;
  }

  return 'app';
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) return override;

  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    out[key] = isPlainObject(out[key]) && isPlainObject(value)
      ? deepMerge(out[key], value)
      : value;
  }
  return out;
}

// App bundle icon (shown in OS file explorer, installer, Start Menu, Dock).
// electron-builder can convert assets/icon.png for platform package icons.
// Use assets/icon.icns or assets/icon.ico when you need a hand-crafted platform file.
const iconPng  = asset('icon.png');
const iconIcns = asset('icon.icns') ?? iconPng;
const iconIco  = asset('icon.ico')  ?? iconPng;

/** @type {import('electron-builder').Configuration} */
const defaultConfig = {
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
    // See: plugins.Electron.browserWindow.icon and plugins.Electron.ui.splashScreen.image.
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
    executableName: appExecutableName,
    artifactName: `${appExecutableName}-Setup-\${version}-\${arch}.\${ext}`,
    target: [{ target: 'nsis', arch: ['x64', 'arm64'] }],
    // Keep executable resource editing enabled so electron-builder can write the
    // app icon and metadata into the .exe. This only disables code signing.
    signExecutable: false,
  },
  linux: {
    icon: iconPng,
    target: [{ target: 'AppImage', arch: ['x64', 'arm64'] }],
    category: 'Utility',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createStartMenuShortcut: true,
    shortcutName: appName,
  },
};

module.exports = deepMerge(defaultConfig, builderOverrides);
