# Contributing

Contributions are welcome — bug fixes, improvements to the template, new docs, and fixes to the CLI are all appreciated.

---

## Requirements

- Node.js ≥ 24
- npm ≥ 10

---

## Getting started

```bash
git clone https://github.com/devioarts/capacitor-electron
cd capacitor-electron
npm install
npm run build
```

The build compiles CLI scripts, shared types, and packs the template into `template-electron.tar.gz`.

---

## Project structure

```
src/
  cli/               ← cap-electron CLI commands
  shared/            ← exported TypeScript types (ElectronConfig, etc.)
  template-electron/ ← the electron/ folder scaffolded into user projects
  template-plugin/   ← starter template for plugin authors
scripts/
  build.ts           ← build orchestrator
docs/                ← feature documentation
```

See [docs/architecture.md](docs/architecture.md) for a full architecture walkthrough.

---

## Testing changes locally

The easiest way to test against a real Capacitor app is to `npm link` (or `file:` install) the package:

```bash
# In this repo:
npm run build

# In your test Capacitor project:
npm install --save-dev file:/path/to/capacitor-electron
npx cap-electron add
npx cap-electron open
```

Changes to CLI scripts require a rebuild (`npm run build`) before they take effect. Changes to the template require a rebuild + a fresh `cap-electron add` (or manually copying changed files into your test project's `electron/` folder).

---

## Template changes

The template lives in `src/template-electron/`. It is packed into `template-electron.tar.gz` on every build.

Files under `src/user/` (shortcuts, tray menu, plugin registrations) are user-editable and are **never overwritten** by `cap-electron sync`. Keep this guarantee — do not add sync logic that touches `src/user/`.

Files under `src/system/generated/` are **always overwritten** by `cap-electron sync`. Never add hand-written code there.

---

## Adding a new CLI command

1. Add `src/cli/<command>.ts`.
2. Register it in `src/cli/index.ts` (the `scripts` map).
3. Export it from `scripts/build.ts` `cliEntries`.
4. Document the command in `README.md`.

---

## Docs

Documentation lives in `docs/`. Each feature has its own file. All docs must be written in **English** — the project is public and targets an international audience.

When adding a feature that has user-facing configuration, also update the config table in `README.md`.

---

## Code style

- TypeScript strict mode (`strict: true` in `tsconfig.json`).
- ESM throughout in the CLI and shared package (`"type": "module"` in `package.json`).
- The Electron template uses CommonJS (`"type": "commonjs"`) because Electron's main process requires CJS.
- No external runtime dependencies beyond `tar` (used for the template archive). Keep the CLI lean.
- Comments in English. JSDoc on exported functions.

---

## Submitting changes

1. Fork the repository and create a branch from `main`.
2. Make your changes and run `npm run build` + `npm run typecheck`.
3. Open a pull request with a clear description of what changed and why.

---

## Reporting issues

Please open an issue on GitHub with:
- The `cap-electron` version (from `npm list @devioarts/capacitor-electron`).
- Your OS and Electron version.
- A minimal reproduction if possible.
