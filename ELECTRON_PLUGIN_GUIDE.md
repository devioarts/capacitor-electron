# Adding Electron Support to a Capacitor Plugin

A Capacitor plugin is normally created with:

```bash
npm init @capacitor/plugin@latest
```

That gives you iOS, Android and Web implementations. To also support Electron (via
`@devioarts/capacitor-electron`), you add an `electron/` folder and three small changes
to `package.json`. Nothing else.

---

## How it works

`cap-electron sync` reads every installed npm package that has a
`capacitor.electron.src` field in its `package.json`. For each one it loads
`electron/dist/plugin-settings.js` and auto-generates:

| Generated file | What it does |
|---|---|
| `src/system/generated/plugins-preload-auto.ts` | Preload bridge — tells the renderer which plugins exist |
| `src/system/generated/plugins-main-auto.ts` | Main-process wiring — calls `ipcMain.handle` for every method |

You write the plugin class with async methods. The IPC wiring is generated for you.
For auto-registration, the package's `./electron` export must expose a symbol with the
same name as `pluginClass`; `cap-electron sync` imports it as
`import { PluginClass } from 'your-plugin/electron'`.

---

## File structure to add

```
your-plugin/
├── electron/                        ← add this whole folder
│   ├── src/
│   │   ├── index.ts                 ← plugin class (main-process implementation)
│   │   └── plugin-settings.ts      ← descriptor read by cap-electron sync
│   ├── types-public/
│   │   └── index.d.ts              ← published type declarations
│   ├── rollup.config.mjs           ← bundles to electron/dist/
│   └── tsconfig.json
└── package.json                     ← add 3 things (see below)
```

---

## 1. `electron/src/plugin-settings.ts`

This is the most important file — `cap-electron sync` reads it to generate the IPC bridge.

The published `electron/dist/plugin-settings.js` must be loadable via CommonJS
`require()`. The example Rollup config below emits this file as CJS; ESM-only
settings files are skipped by `cap-electron sync`.

```typescript
import type { PluginSettings } from '@devioarts/capacitor-electron';

export const pluginSettings: PluginSettings = {
  // Class name — must match the export from my-plugin/electron AND the Capacitor plugin name
  pluginClass: 'MyPlugin',

  // Methods to bridge via IPC — must match method names in your class
  pluginMethods: ['echo', 'getDataPath'],

  // Events emitted from main → renderer (leave empty if unused)
  pluginEvents: [],

  // Omit to use the default (auto-register). Set false only for manual wiring.
  // autoRegister: false,

  // If your plugin reads its own section from capacitor.config (e.g. plugins.MyPlugin),
  // list the section name(s) here. cap-electron sync will copy them automatically into
  // electron/capacitor.config.json — the app developer needs no extra configuration.
  // configSections: ['MyPlugin'],
};
```

---

## 2. `electron/src/index.ts`

The actual plugin logic. Runs in the **main process** — full access to Node.js and Electron APIs.

```typescript
import { app } from 'electron';
import * as path from 'path';

export class MyPlugin {
  async echo(opts: { value: string }): Promise<{ value: string }> {
    return { value: opts.value };
  }

  async getDataPath(): Promise<{ path: string }> {
    return { path: path.join(app.getPath('userData'), 'MyPlugin') };
  }
}
```

**Rules:**
- The package's `./electron` export must export a class/function with the same name as
  `pluginClass`. For this example, `my-plugin/electron` must export `MyPlugin`.
- Methods must be `async`.
- Options come as plain JSON objects — no class instances, no functions, no `undefined`.
- Errors thrown inside a method are caught by the IPC bridge and forwarded to the renderer.
- Auto-registered plugins are registered after `app.whenReady()`.

---

## 3. `electron/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "build",
    "rootDir": "src",
    "declaration": true,
    "strict": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

> If you need to import types from the plugin's main `src/` folder, change
> `rootDir` to `".."` (project root) and adjust rollup inputs accordingly.
> See `@devioarts/capacitor-sqlite` for a real example.

---

## 4. `electron/rollup.config.mjs`

Bundles the tsc output (`electron/build/`) into distributable CJS files (`electron/dist/`).
Run via the `build:electron` script below.

```js
export default [
  {
    input: 'electron/build/index.js',
    output: [{ file: 'electron/dist/plugin.cjs.js', format: 'cjs', sourcemap: true }],
    external: ['electron'],
  },
  {
    input: 'electron/build/plugin-settings.js',
    output: [{ file: 'electron/dist/plugin-settings.js', format: 'cjs', sourcemap: true }],
    external: [],
  },
];
```

---

## 5. `electron/types-public/index.d.ts`

Hand-written type declarations. Published to npm so users get autocomplete when
importing from `'my-plugin/electron'`.

```typescript
export declare class MyPlugin {
  static readonly pluginMethods: readonly string[];
  echo(opts: { value: string }): Promise<{ value: string }>;
  getDataPath(): Promise<{ path: string }>;
}
```

---

## 6. `package.json` — three additions

### a) Exports

```json
"exports": {
  ".": { ... },
  "./electron": {
    "types": "./electron/types-public/index.d.ts",
    "require": "./electron/dist/plugin.cjs.js",
    "default": "./electron/dist/plugin.cjs.js"
  },
  "./electron/settings": {
    "require": "./electron/dist/plugin-settings.js",
    "default": "./electron/dist/plugin-settings.js"
  }
}
```

### b) Capacitor field

```json
"capacitor": {
  "ios": { "src": "ios" },
  "android": { "src": "android" },
  "electron": { "src": "electron" }
}
```

This is the flag `cap-electron sync` checks. Without it the plugin is ignored.

### c) Build script + files

```json
"scripts": {
  "build:electron": "tsc --project electron/tsconfig.json && rollup -c electron/rollup.config.mjs",
  "verify:electron": "npm run build:electron"
},
"files": [
  "dist/",
  "electron/dist/",
  "electron/types-public/"
]
```

---

## End-to-end flow

```
Plugin author:
  npm run build:electron       → electron/dist/plugin.cjs.js
                                 electron/dist/plugin-settings.js

App developer:
  npm install my-plugin
  cap-electron sync            → reads electron/dist/plugin-settings.js
                               → writes electron/src/system/generated/plugins-preload-auto.ts
                               → writes electron/src/system/generated/plugins-main-auto.ts
  cap-electron open            → builds & launches Electron with the plugin wired in
```

---

## Reading capacitor.config in your plugin

Some plugins need their own configuration block from `capacitor.config`. A good example is a
SQLite plugin that allows the developer to configure encryption, the database location, or other
driver-level options that must be known at startup.

`cap-electron sync` copies only a fixed set of top-level keys (`appId`, `appName`, `webDir`,
`backgroundColor`) and the `plugins.Electron` section into `electron/capacitor.config.json`.
All other sections are stripped. Without `configSections`, your plugin's configuration block
would be absent from the file your Electron code reads.

### Declaring required config sections

Add `configSections` to your `plugin-settings.ts`:

```typescript
export const pluginSettings: PluginSettings = {
  pluginClass: 'CapacitorSQLite',
  pluginMethods: ['open', 'query', 'close'],

  // Tell cap-electron sync to copy plugins.CapacitorSQLite from capacitor.config
  // into electron/capacitor.config.json.
  configSections: ['CapacitorSQLite'],
};
```

The app developer configures the plugin in their `capacitor.config.ts` as they normally would:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'My App',
  plugins: {
    CapacitorSQLite: {
      electronIsEncryption: false,
      electronSaveDatabasesFrom: 'userData',
    },
  },
};
```

After `cap-electron sync`, `electron/capacitor.config.json` will contain:

```json
{
  "appId": "com.example.app",
  "appName": "My App",
  "plugins": {
    "Electron": { ... },
    "CapacitorSQLite": {
      "electronIsEncryption": false,
      "electronSaveDatabasesFrom": "userData"
    }
  }
}
```

Your plugin reads it at runtime via the standard `loadConfig()` helper or directly from the file —
no extra setup is needed from the app developer's side.

> **Multiple sections:** you can declare more than one name in `configSections` if your plugin
> uses multiple keys. Sections from all installed plugins are merged — there is no conflict as
> long as section names are unique (which they should be, matching the plugin class name).

> **Warning on missing sections:** if a section is listed in `configSections` but not present in
> the project's `capacitor.config`, `cap-electron sync` prints a warning so developers can catch
> typos or forgotten configuration early.

---

## Reference: full `plugin-settings.ts` fields

| Field | Type | Required | Description |
|---|---|---|---|
| `pluginClass` | `string` | ✓ | Class name in `electron/src/index.ts` |
| `pluginMethods` | `string[]` | ✓ | Methods to expose via IPC |
| `pluginEvents` | `string[]` | | Events emitted to renderer |
| `autoRegister` | `boolean` | | Default: `true`. Set `false` to skip auto-wiring. |
| `configSections` | `string[]` | | `capacitor.config` plugin section names to copy into `electron/capacitor.config.json` |

`plugin-settings.js` is loaded with CommonJS `require()`, so publish the
compiled settings descriptor as CJS even if the rest of your package is ESM.
The legacy `imports` and `beforeRegister` fields are ignored. `cap-electron sync`
always imports `{ pluginClass }` from `${packageName}/electron` and registers
auto plugins after `app.whenReady()`.

---

## Real example

See [`@devioarts/capacitor-sqlite`](https://github.com/devioarts/capacitor-sqlite) —
`electron/` folder is the reference implementation.
