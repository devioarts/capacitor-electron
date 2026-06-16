# Audit report: @devioarts/capacitor-electron

Datum auditu: 2026-06-16
Pracovni slozka: /Users/mosin/Desktop/PROJECTS/capacitor/capacitor-electron
Stav: podrobny technicky audit bez oprav kodu. Jedina nova zmena vytvorena v ramci auditu je tento report.

## Shrnutí

Projekt ma dobry zaklad: root `npm run typecheck` prosel, root `npm run build` prosel, runtime Electron template pouziva `contextIsolation: true` a `nodeIntegration: false`, a hlavni dokumentace je celkove bohata.

Soucasne ale existuji vazne problemy v runtime bezpecnosti, generovani plugin bridge, synchronizaci `electron-init.js`, deep linkingu a playgroundu. Nejdulezitejsi rizika:

1. `serveMode: "server"` ma path traversal v lokalnim HTTP serveru.
2. Plugin generator generuje import na starou neexistujici cestu `../static/functions`, takze treti-stranne Electron pluginy mohou rozbit build.
3. `electron-init.js` ma drift mezi template a playgroundem; jedna varianta rozbije `CapacitorCustomPlatform.plugins`, druha pravdepodobne vynechava built-in `PluginHeaders`.
4. IPC/preload vystavuje obecne volatelne bridge bez validace senderu/originu a bez omezeni navigace/noveho okna.
5. Deep linking se na `will-quit` odregistruje jako protocol client, coz muze zrusit trvale asociace po normalnim ukonceni aplikace.
6. `playground/electron` je staged jako kompletne smazany adresar, zatimco `playground/package.json` stale obsahuje Electron skripty, ktere na nem zavisi.
7. Playground lint aktualne pada.

## Ověřené příkazy

- `node -v`: v24.16.0
- `npm -v`: 11.13.0
- `npm run typecheck` v rootu: OK
- `npm run build` v rootu: OK
- `npm audit --omit=dev --json` v rootu: OK, 0 zranitelnosti v produkcnich zavislostech
- `npm audit --json` v rootu: FAIL, 1 high dev zranitelnost v `esbuild` podle locku (`GHSA-gv7w-rqvm-qjhr`)
- `npm run build` v `playground`: OK
- `npm run typecheck` v `playground`: FAIL, script neexistuje
- `npm run lint` v `playground`: FAIL, 1 error + 5 warnings
- `npm audit --json` v `playground`: OK, 0 zranitelnosti

## Stav pracovního stromu

Audit byl proveden nad aktualnim pracovnim stromem, ne nad cistym `origin/main`.

Staged zmeny:
- 43 souboru v `playground/electron/*` je staged jako smazanych, celkem 7274 radku mazani.

Unstaged zmeny:
- `playground/public/electron-init.js`
- `src/cli/electron-init.ts`
- `src/shared/globals.d.ts`
- `src/shared/types.ts`
- `src/template-electron/src/system/js/electron-init.js`
- `src/template-electron/src/system/shared/types.ts`
- `src/template-electron/src/system/static/capacitor-api/filesystem-main.ts`

To je dulezite: cast nalezu se tyka prave soucasneho rozpracovaneho stavu. Nic z toho jsem nerevertoval.

## Nálezy podle závažnosti

### CRITICAL: path traversal v embedded HTTP serveru

Soubor: `src/template-electron/src/system/static/electron-api/server-main.ts:45-55`

Server pro `serveMode: "server"` bere `req.url`, provede `path.join(distDir, urlPath)` a cte vysledny soubor. Neni zde `decodeURIComponent`, `path.normalize`, `path.resolve` ani kontrola, ze vysledna cesta zustava uvnitr `distDir`.

Riziko:
- Pozadavek typu `/../../...` muze uniknout mimo `app/`.
- Server bezi na `127.0.0.1` a nahodnem portu, coz je lepsi nez verejne bindovani, ale stale to neni dostatecna ochrana proti lokalnim procesum nebo pripadum, kdy se port zjisti.

Doporuceni:
- Pouzit `new URL(req.url, "http://127.0.0.1")`, dekodovat cestu, `path.resolve(distDir, "." + pathname)` a odmitnout, pokud `!resolved.startsWith(path.resolve(distDir) + path.sep)` a neni presne `distDir`.
- Odmitnout encoded traversal (`%2e%2e`), null-byte a backslash varianty.
- Pridat testy pro `/../`, `/..%2F`, `%5C`, query string a SPA fallback.

### CRITICAL: generator pluginu pouziva starou cestu `../static/functions`

Soubor: `src/cli/update.ts:109-113`

`generateElectronMainAuto()` generuje:

```ts
import { registerPlugin, AnyRecord } from '../static/functions';
```

Aktualni template ma helper v `src/system/shared/functions.ts`, ne ve `src/system/static/functions.ts`. Pokud `cap-electron sync` najde jakykoli auto-registered plugin, vygenerovany `plugins-main-auto.ts` bude importovat neexistujici soubor a Electron build spadne.

Dukaz:
- Aktualni template exportuje `registerPlugin` z `src/template-electron/src/system/shared/functions.ts`.
- Dokumentace stale obsahuje stare cesty ve `docs/electron-plugin-guide.md:33`, `:86`, `:123`.

Doporuceni:
- Opravit generator na `../shared/functions`.
- Opravit dokumentaci na `../system/shared/functions`.
- Pridat fixture plugin do testu, aby build overil skutecny generated import.

### HIGH: `electron-init.js` drift rozbiji registraci pluginu

Soubory:
- `src/template-electron/src/system/js/electron-init.js:24-84`
- `playground/public/electron-init.js:29-124`
- `src/template-electron/src/system/static/plugins-api/plugins-preload.ts:132-135`
- `src/template-electron/src/system/static/capacitor-api/capacitor-preload.ts:108-142`

Template preload vytvori `window.CapacitorCustomPlatform = { name: "electron", plugins: bridged }`. Template `electron-init.js` ho pak prepisuje na `{ name: "electron" }`, cimz zahodi `plugins`. To je primo v rozporu s komentarem v `plugins-preload.ts`, ktery slibuje, ze treti-stranne pluginy zustanou dostupne pres `CapacitorCustomPlatform.plugins`.

Playground ma jinou verzi `public/electron-init.js`, ktera `plugins` zachovava a pridava built-in bridges do `CapacitorCustomPlatform.plugins`. Jenze v te verzi `window.Capacitor.PluginHeaders` nastavuje pouze na `b.getPluginHeaders()`, tedy bez built-in headers. Podle komentare v template verzi prave built-in `PluginHeaders` zajistuji, aby built-in Capacitor pluginy nespadly na web implementaci.

Riziko:
- V template verzi mohou selhat pluginy s `electron:` factory, ktere cekaji `window.CapacitorCustomPlatform.plugins.MyPlugin`.
- V playground verzi mohou selhat nebo se chovat jinak built-in pluginy bez `electron:` factory.
- Source of truth neni jasny: template a playground se rozesly.

Doporuceni:
- Udelat jednu canonical verzi `electron-init.js`.
- Zachovat `CapacitorCustomPlatform.plugins` z preloadu a zaroven zahrnout built-in i third-party `PluginHeaders`.
- Po `cap-electron sync`/`copy` generovane `public/electron-init.js` nesmi zustavat v rucne upravenem driftu.
- Pridat E2E smoke test: `Capacitor.getPlatform() === "electron"`, built-in `App.getInfo()` pres native bridge, a fake third-party plugin pres `electron:` factory.

### HIGH: IPC bridge nema sender/origin validaci a vystavuje prilis obecnou plochu

Soubory:
- `src/template-electron/src/system/shared/functions.ts:48-59`
- `src/template-electron/src/system/static/capacitor-api/capacitor-preload.ts:111-112`
- `src/template-electron/src/system/static/plugins-api/plugins-preload.ts:107-109`
- `src/template-electron/src/system/static/electron-api/system-preload.ts`
- `src/template-electron/src/system/static/electron-api/system-main.ts`

Renderer muze pres `_CapElectron.invoke(channel, opts)` volat libovolny channel string. Main registruje plugin IPC bez kontroly `event.sender`, originu nebo toho, ze volani prislo z ocekavaneho hlavniho okna. System bridge navic umoznuje `quit`, `reload`, `openDevTools`, global shortcuts, badge, screen/power API.

Riziko:
- Pri XSS v rendereru ma utocnik pristup k cele expose plose.
- Pokud aplikace naviguje mimo ocekavany origin nebo otevre necekane webContents, chybi centralni obrana na urovni IPC senderu.

Oficialni Electron dokumentace doporucuje validovat sender vsech IPC zprav, mit context isolation, sandbox, CSP a omezovat navigaci / vytvareni novych oken:
- https://www.electronjs.org/docs/latest/tutorial/security

Doporuceni:
- Nedavat rendereru obecne `invoke(channel, opts)`. Exponovat jen allowlist metod.
- V `ipcMain.handle` overovat `event.senderFrame.url` / `event.sender.id` proti hlavni aplikacni window.
- Pro system API zvazit explicitni opt-in v configu, minimalne pro `openDevTools`, `quit`, `reload`, runtime global shortcuts.
- Pridat test, ze neznamy channel a neznamy sender jsou odmitnuty.

### HIGH: chybi omezeni navigace, novych oken a permission requestu

Soubor: `src/template-electron/main.ts:72-93`

Dobry zaklad:
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox` zustava na Electron defaultu, pokud uzivatel nenastavi jinak.

Chybi:
- `webContents.on("will-navigate", ...)` s allowlistem.
- `webContents.setWindowOpenHandler(...)` s deny-by-default.
- `session.setPermissionRequestHandler(...)` s deny-by-default a allowlistem.
- Centralni `web-contents-created` hardening.

Riziko:
- Pokud renderer nebo remote/dev content vyvola navigaci, muze se privilegovany preload/IPC ocitnout na necekanem originu.
- Permission requesty maji v Electronu defaulty, ktere je bezpecnejsi explicitne uzamknout.

Doporuceni:
- V produkci povolit jen `file://`/lokalni server vlastni appky, pripadne explicitni `devUrl` pouze v dev.
- Vsechny `window.open`/target blank defaultne deny; externi URL otevirat pres bezpecne validovanou funkci.
- Permission handler deny-by-default; povolit jen konkretni permission a origin.

### HIGH: deep linking se pri ukonceni odregistruje

Soubor: `src/template-electron/src/system/static/electron-api/deep-link-main.ts:30-50`

Kod vola `app.setAsDefaultProtocolClient(scheme)` a na `will-quit` vola `app.removeAsDefaultProtocolClient(scheme)`.

Riziko:
- Po normalnim ukonceni aplikace se muze zrusit OS asociace protokolu. Deep linky pak nemusi fungovat pri dalsim cold startu.
- Dokumentace `docs/deep-linking.md:80-90` popisuje cold start scenare, ale implementace si handler sama odstranuje.

Oficialni Electron deep link priklady registruji protocol client a pouzivaji `second-instance` / `open-url`; neodstranuji asociaci pri kazdem quit:
- https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app

Doporuceni:
- Neodregistrovavat protocol client na normalni `will-quit`.
- Pripadne mit separatni uninstall/cleanup command, ne runtime cleanup.
- Doplnit test: zabalena aplikace, nastaveni protokolu, quit, klik na deep link po ukonceni.

### HIGH: staged smazani `playground/electron` rozbiji Electron playground

Stav:
- `git diff --cached --stat`: 43 souboru v `playground/electron` smazano, 7274 radku.
- `playground/package.json:30-45` stale ukazuje `main: "electron/main.cjs"` a skripty `electron:build`, `electron:dev`, `electron:dist*`, ktere vyzaduji `electron/main.ts` a `electron/preload.ts`.

Riziko:
- Playground uz neni samostatne spustitelny starym `electron:*` tokem.
- `TESTING.md` stale tvrdi, ze rada playground/Electron veci je testovana.

Doporuceni:
- Rozhodnout, jestli playground ma pouzivat jen `cap-electron add/open`, nebo ma drzet `playground/electron` jako fixture.
- Pokud se `playground/electron` maze zamerne, upravit `playground/package.json`, `TESTING.md` a docs.
- Pokud ne, staged deletions vratit.

### HIGH: `App.getLaunchUrl()` vraci normalni renderer URL

Soubor: `src/template-electron/src/system/static/capacitor-api/app-main.ts:9-14`, `:43-46`

`parseLaunchUrl()` po nenalezeni deep linku vraci `getMainWindow()?.webContents.getURL() ?? null`. Dokumentace `docs/app.md` tvrdi, ze `getLaunchUrl()` vraci `null`, kdyz app byla otevrena normalne.

Riziko:
- Aplikace muze normalni launch interpretovat jako deep link.
- V dev modu se muze vracet `http://localhost:5173`, v prod `file://...` nebo local server URL.

Doporuceni:
- Vracet pouze skutecny deep link z argv/open-url, jinak `null`.
- Ulozit startup URL do samostatne promenne pri startu a po precteni ji pripadne vycistit podle Capacitor semantics.

### HIGH: Filesystem umoznuje unik z mapovane directory a spatne sklada file URI

Soubor: `src/template-electron/src/system/static/capacitor-api/filesystem-main.ts:18-22`, `:55-56`, `:127-149`

`resolvePath()` dela `path.join(base, filePath)`. Pokud `filePath` obsahuje `..`, muze uniknout mimo `Documents`, `Data`, `Cache` atd. Pri vynechane `directory` se path bere jako absolutni.

`toUri()` rucne sklada `file://` pres split path separatoru. Na Windows to typicky vyrobi tvar typu `file://C:/...` misto spravneho `file:///C:/...`. Bezpecnejsi a korektni je `pathToFileURL(abs).href`.

Riziko:
- Renderer muze cist/zapisovat mimo deklarovanou Capacitor directory.
- URI muze byt nekorektni na Windows a u specialnich znaku.

Doporuceni:
- U directory-based cest zakazat absolute path a po `path.resolve(base, filePath)` kontrolovat zustani uvnitr base.
- Pouzit `pathToFileURL`.
- Dokumentovat, pokud je absolutni filesystem access zamerna desktop vlastnost; ted je to bezpecnostne citlive API.

### MEDIUM: `shell.openExternal` validuje jen tri unsafe scheme

Soubor: `src/template-electron/src/system/static/capacitor-api/browser-main.ts:5-10`, `:26-30`, `:55-60`

`Browser.open()` a `AppLauncher.openUrl()` zakazuji `javascript:`, `data:`, `vbscript:`, ale povoluji vse ostatni vcetne `file:`, `smb:`, `mailto:`, custom schemes atd.

Dokumentace `docs/browser.md` rika, ze URL ma byt `https://`, `http://`, nebo custom scheme, ale kod to explicitne nehlida.

Riziko:
- `shell.openExternal` je mocna OS primitive; pri renderer XSS muze otevrit lokalni soubory nebo citlive systemove handlery.

Doporuceni:
- Mit allowlist scheme: minimalne `http:`, `https:`; custom schemes povolit pres config.
- Pro `AppLauncher` zvazit samostatny config allowlist.
- Logovat/vracet odmítnuti konzistentne.

### MEDIUM: `cap-electron sync` dela `copy` a ignoruje jeho failure

Soubor: `src/cli/sync.ts:1-15`

`sync` spusti `copy.js`, pri chybe jen varuje a pokracuje `update.js`. README popisuje `sync` hlavne jako scan pluginu/generovani bridge/sync configu. `copy` navic vyzaduje existujici web build dir.

Riziko:
- `cap-electron sync` muze koncit uspechem, i kdyz web assets nejsou zkopirovane.
- V CI nebo release procesu muze chyba copy snadno uniknout.
- Semantika je odlisna od Capacitor `sync`, kde by ocekavani melo byt jasne.

Doporuceni:
- Rozdelit `sync` a `copy`, nebo zavest flagy `--no-copy` / `--copy`.
- Pokud `sync` ma kopirovat, failure by mel byt fail, ne warning.
- Aktualizovat README/test tracker.

### MEDIUM: parsovani `capacitor.config.ts` je krehke

Soubor: `src/cli/update.ts:261-331`

Pokud neni `CAPACITOR_CONFIG`, CLI se snazi TS/JS config prevest regexy do JSON. To selze nebo se spatne zachova u:
- promennych a spreadu,
- `process.env`,
- `defineConfig(...)`,
- trailing komplexnich typu,
- stringu s apostrofy,
- komentaru/URL edge cases,
- dynamickych configu podle env.

Riziko:
- `electron/capacitor.config.json` muze byt tise nekompletni.
- `webDir`, `plugins.Electron`, deep linking nebo plugin config sections se nemusi propsat.

Doporuceni:
- Preferovat oficialni Capacitor config loader, nebo pouzit `tsx`/dynamic import pro local CLI.
- Pokud ma zustat regex parser, jasne vypsat unsupported syntax a failnout s actionable chybou.
- Pridat fixture testy pro `defineConfig`, env, spread a nested plugin config.

### MEDIUM: root dev audit hlasi high `esbuild`

Soubor: `package.json:53-59`, `package-lock.json`

`npm audit --json` v rootu hlasi high advisory `GHSA-gv7w-rqvm-qjhr` pro `esbuild` v rozsahu `>=0.17.0 <0.28.1`. Root `package.json` ma `esbuild: ^0.25.0`, template ma `^0.28.1`.

Riziko:
- Jde o dev dependency, ne runtime dependency, ale build/release pipeline pouziva esbuild.

Doporuceni:
- Sjednotit root `esbuild` na opravenou verzi podle advisories.
- Znovu vygenerovat lock a spustit audit.

### MEDIUM: LocalNotifications event payload neodpovida docs

Soubory:
- `src/template-electron/src/system/static/capacitor-api/local-notifications-main.ts:55-58`
- `docs/local-notifications.md:120-123`

Kod emituje `localNotificationReceived` jako `{ notification: n }`, zatimco docs ukazuji callback `(notification) => notification.title`.

Riziko:
- Uzivatel podle docs dostane `notification.title === undefined`.

Doporuceni:
- Sjednotit s Capacitor API. Bud upravit payload na samotnou notification schema, nebo docs zmenit na `({ notification })`.
- Pridat playground test pro event payload.

### MEDIUM: `TESTING.md` obsahuje nepresnosti proti realnemu kodu

Soubor: `TESTING.md`

Priklady:
- `TESTING.md:23`: `update` pry overwrituje system files, ale aktualni `src/cli/update.ts` generuje bridge/config a injectuje init; system files resi `upgrade`.
- `TESTING.md:24`: `upgrade` pry aktualizuje npm dependencies, ale `src/cli/upgrade.ts` kopiruje template system files a jen s `--all` mergeuje package.
- `TESTING.md:26`: `scripts` pry spousti script v `electron/package.json`, ale `src/cli/scripts.ts` pridava `electron:*` scripts do root `package.json`.
- `TESTING.md:39`: Browser popisuje `new BrowserWindow`, `close`, screenshot; realny kod pouziva `shell.openExternal`, `close()` je no-op, `getSnapshot()` vraci `null`.
- `TESTING.md:40`: Dialog popisuje file dialogy, ale kod implementuje jen `alert`, `confirm`, `prompt`.
- `TESTING.md:60`: `getAppVersion` pry bez IPC round-tripu, ale `system-preload.ts` vola `ipcRenderer.invoke("system:getAppVersion")`.

Doporuceni:
- Prepsat `TESTING.md` podle aktualni implementace.
- Oddelit "manual tested" od "expected behavior".
- Uvazovat automaticky smoke test matrix.

### MEDIUM: docs obsahuji stare import cesty

Soubory:
- `docs/electron-plugin-guide.md:33`, `:86`, `:123`
- `docs/global-shortcuts.md:13`
- `docs/tray-menu.md:44`

Docs ukazuji:
- `../system/static/functions`
- `../system/static/shortcuts-main`
- `../system/static/tray-main`

Aktualni template pouziva:
- `../system/shared/functions`
- `../system/static/electron-api/shortcuts-main`
- `../system/static/electron-api/tray-main`

Riziko:
- Uživatel podle docs zkopiruje kod, ktery nebude kompilovat.

Doporuceni:
- Opravit docs a pridat doc-snippet typecheck, pokud to projekt bude dlouhodobe udrzovat.

### MEDIUM: `src/shared/types.ts` komentar ukazuje na starou cestu

Soubor: `src/shared/types.ts:1-3`

Aktualni export jde ze `../template-electron/src/system/shared/types`, ale komentar porad rika `src/template-electron/src/system/static/types.ts`.

Doporuceni:
- Opravit komentar, protoze tenhle soubor je soucast public package build pipeline a mate maintainery.

### MEDIUM: CSP dokumentace muze byt prilis sebejista pro `file://`

Soubory:
- `src/template-electron/src/system/static/electron-api/csp-main.ts`
- `docs/content-security-policy.md:123-128`
- `src/template-electron/main.ts:84-92`

Docs tvrdi, ze CSP pres response headers funguje spolehlive i s dynamicky loaded content. Produkce defaultne pouziva `win.loadFile(...)`, pokud neni `serveMode: "server"`. Je potreba explicitne overit, ze `session.defaultSession.webRequest.onHeadersReceived` skutecne aplikuje CSP i pro `file://` v Electron 42 ve vsech cilovych OS.

Doporuceni:
- Pridat runtime smoke test: v produkcnim `loadFile` zkusit inline/eval a overit, ze CSP blokuje.
- Pokud ne, pouzit CSP meta tag injection nebo preferovat custom protocol/local server s headers.

### LOW/MEDIUM: `downloadFile` muze obchazet renderer CSP a nema URL policy

Soubor: `src/template-electron/src/system/static/capacitor-api/filesystem-main.ts:168-179`

Main process provadi `fetch(url)` s renderer-provided URL a zapisuje vysledek na filesystem. To muze obchazet renderer CSP/connect-src a muze slouzit jako main-process network primitive.

Doporuceni:
- Allowlist protocolu `http:`/`https:`.
- Volitelne host allowlist v configu.
- Zakazat localhost/RFC1918/metadata IP podle threat modelu, pokud aplikace zpracovava neduveryhodny content.

### LOW/MEDIUM: `powerMonitor` se registruje pri importu

Soubor: `src/template-electron/src/system/static/electron-api/power-monitor-main.ts`

Modul registruje `powerMonitor.on(...)` pri importu, zatimco zbytek nekterych Electron API ceka na `app.whenReady()`. Je potreba overit, zda Electron 42 garantuje bezproblemove pouziti `powerMonitor` pred ready na vsech platformach.

Doporuceni:
- Presunout registraci do `app.whenReady().then(...)`, podobne jako screen events.
- Pridat smoke test startu.

### LOW: Playground lint pada

Soubor: `playground/src/components/Logger.tsx:59`

`npm run lint` v playgroundu hlasi:
- error `react-refresh/only-export-components` kvuli `useLogger` exportu ve stejnem souboru jako komponenty,
- 5 warningu `react-hooks/exhaustive-deps` v page komponentach.

Doporuceni:
- Rozdelit context/hook a komponenty, nebo upravit lint pravidlo vedome.
- Opravit dependency arrays, pripadne stabilizovat `log` hook hodnotu.

## Pozitivní zjištění

- Root TypeScript strict typecheck prosel.
- Root build prosel a obnovil `src/shared/types.ts` po docasnem prepisu ve `scripts/build.ts`.
- Template BrowserWindow ma bezpecny zaklad: `contextIsolation: true`, `nodeIntegration: false`.
- `electron-builder.js` oddeluje runtime assets a app resources rozumne.
- Dokumentace jasne uvadi mnoho desktop omezeni built-in pluginu.
- Produkcni dependency audit root baliku je cisty (`npm audit --omit=dev`).
- Playground build (`tsc -b && vite build`) prosel.

## Doporučené pořadí oprav

1. Opravit `server-main.ts` path traversal a pridat testy.
2. Opravit `update.ts` generated import na `../shared/functions`; pridat fixture plugin test.
3. Sjednotit `electron-init.js` a overit built-in i third-party plugin routing.
4. Odstranit `removeAsDefaultProtocolClient` z normalniho quit toku.
5. Pridat Electron hardening: IPC sender validation, navigation allowlist, deny new windows, permission handler.
6. Vyresit staged smazani `playground/electron` a upravit playground scripts podle rozhodnuti.
7. Opravit `App.getLaunchUrl()`.
8. Zabezpecit Filesystem path resolving a pouzit `pathToFileURL`.
9. Opravit docs/test tracker stale cesty a nepresne popisy.
10. Updatovat root `esbuild` a lockfile.
11. Opravit playground lint.

## Zdroje použité pro porovnání s aktuální praxí

- Electron Security checklist / tutorial: https://www.electronjs.org/docs/latest/tutorial/security
- Electron Deep Links tutorial: https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app
- Capacitor plugin creation docs: https://capacitorjs.com/docs/plugins/creating-plugins

