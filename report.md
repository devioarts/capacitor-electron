# Report: dokumentace vs. implementace

Datum: 2026-06-20

## Rozsah

- Prosel jsem dokumentaci v `README.md` a `docs/*.md`.
- Prosel jsem runtime implementace v `src/template-electron/src/system/static/**`, sdilene typy/bridge v `src/template-electron/src/system/shared/**`, renderer init v `src/template-electron/src/system/js/electron-init.js` a relevantni CLI soubory v `src/cli/**`.
- Playground jsem podle zadani vynechal. V pracovnim stromu uz existuji rozpracovane zmeny v `playground/**`; nesahal jsem na ne.
- Overoval jsem proti oficialnim primarnim zdrojum Capacitor a Electron docs. Markdown externi odkazy v dokumentaci jsem zkontroloval pres HTTP a vsechny aktualni odkazy vraci 200.

## Provedene opravy dokumentace

- Pridal jsem centralni OS matici: `docs/platform-support.md`.
  - Obsahuje podporu pro macOS, Windows a Linux po jednotlivych funkcich/metodach.
  - Rozlisuje `Yes`, `Partial`, `No` a `No-op`.
  - Pridava overene odkazy na oficialni Capacitor, Electron a electron-builder dokumentaci.
- `README.md`
  - Pridan odkaz na `docs/platform-support.md`.
  - U App pluginu doplneno aktualni pokryti metod a udalosti.
  - Pridan aktualni electron-builder CLI odkaz pro platform/arch pravidla.
- `docs/auto-updater.md`
  - Opraven nefunkcni odkaz `https://www.electron.build/configuration/publish` na funkcni `https://www.electron.build/docs/publish/`.
- `docs/app.md`
  - Doplnen oficialni Capacitor odkaz.
  - Popsano jednorazove spotrebovani launch URL.
  - Doplneny `getAppLanguage()`, `toggleBackButtonHandler()`, `appRestoredResult` a OS matice.
- `docs/filesystem.md`
  - Doplnen oficialni Capacitor odkaz.
  - Opravene navratove hodnoty podle implementace: `readdir()` obsahuje `path`, `getUri()` vraci `{ uri, path }`, `stat()` vraci i `path`, `downloadFile()` vraci `{ path, uri }`.
  - Doplneny `checkPermissions()` a `requestPermissions()`.
  - Jasne uvedeno, ze `readFileInChunks()` a stary Filesystem `progress` listener nejsou zatim podporovane.
- `docs/in-app-browser.md`
  - Doplneny oficialni odkazy.
  - Zdokumentovana podpora `electron.window.modal`, ktera uz byla rozpracovana v kodu.
- `docs/browser.md`, `docs/action-sheet.md`, `docs/clipboard.md`, `docs/device.md`, `docs/dialog.md`, `docs/file-transfer.md`, `docs/file-viewer.md`, `docs/local-notifications.md`, `docs/network.md`, `docs/preferences.md`, `docs/privacy-screen.md`, `docs/toast.md`, `docs/electron-desktop-apis.md`
  - Doplneny oficialni odkazy a/nebo OS poznámky.
  - `docs/electron-desktop-apis.md` ma novou souhrnnou OS tabulku pro `window.Electron`.

## Provedene opravy kodu

### Event lifecycle leak / vice oken

Soubor: `src/template-electron/src/system/shared/functions.ts`

Problem: `registerPlugin()` volal `onRemove` hned pri kazdem `event-remove-*`. Pri vice oknech nebo reloadu jednoho rendereru to mohlo predcasne vypnout sdileny zdroj udalosti, napr. Network polling nebo App focus listenery. Pri zavreni okna bez korektniho remove zase hrozilo, ze zdroj zustane bez realnych posluchacu.

Oprava:

- Main process ted drzi pocitadla listeneru podle typu udalosti a `webContents.id`.
- `onAdd` se vola jen pri prechodu z 0 na 1 globalni listener.
- `onRemove` se vola jen pri prechodu z 1 na 0 globalnich listeneru.
- Pri `webContents.destroyed` se listener stavy pro dane okno uklidi automaticky.

### App launch URL a upstream App API

Soubory:

- `src/template-electron/src/system/static/electron-api/deep-link-main.ts`
- `src/template-electron/src/system/static/capacitor-api/app-main.ts`
- `src/template-electron/src/system/js/electron-init.js`

Oprava:

- Cold-start deep link URL se uklada jednou a `App.getLaunchUrl()` ji pri prvnim volani spotrebuje.
- Windows argv fallback uz neni vracen opakovane pri kazdem volani.
- macOS `open-url` pred `app.ready` se umi ulozit jako launch URL.
- Doplneno `App.getAppLanguage()`.
- Doplneno `App.toggleBackButtonHandler()` jako desktop no-op.
- Doplnen `appRestoredResult` event jako desktop no-op listener.

### Filesystem permission metody

Soubory:

- `src/template-electron/src/system/static/capacitor-api/filesystem-main.ts`
- `src/template-electron/src/system/js/electron-init.js`

Oprava:

- Doplneny `Filesystem.checkPermissions()` a `Filesystem.requestPermissions()`.
- Na desktopu vraci `{ publicStorage: 'granted' }`, protoze Node/Electron filesystem pristup nema Android-style runtime permission prompt.

## Soulad s oficialni dokumentaci

Overene primarni zdroje:

- Capacitor API docs: `@capacitor/app`, `action-sheet`, `browser`, `app-launcher`, `clipboard`, `device`, `dialog`, `filesystem`, `file-transfer`, `file-viewer`, `inappbrowser`, `local-notifications`, `network`, `preferences`, `privacy-screen`, `toast`.
- Electron API docs: `app`, `BrowserWindow`, `dialog`, `shell`, `Notification`, `safeStorage`, `globalShortcut`, `powerMonitor`, `powerSaveBlocker`, `desktopCapturer`, `screen`, `session`.
- electron-builder docs: CLI a publish docs.

Nalezeny a opraveny nesoulady:

- `App.getAppLanguage()` a `toggleBackButtonHandler()` chybely v Electron bridge.
- `appRestoredResult` nebyl prijiman jako App listener.
- `Filesystem.checkPermissions()` a `requestPermissions()` chybely v Electron bridge.
- `Filesystem` dokumentace nepopisovala presne realne navratove hodnoty.
- `getLaunchUrl()` nebylo jednorazove a nemelo dobrou macOS cold-start vazbu.
- Jeden externi electron-builder odkaz byl nefunkcni.

## Otevrene body k rozhodnuti

- `App.getLaunchUrl()` bez URL: oficialni Capacitor typ uvadi `AppLaunchUrl | undefined`, aktualni Electron implementace i docs vraci `null`. Nechal jsem to kvuli kompatibilite se stavajici dokumentaci, ale pokud chceme striktni upstream kontrakt, zmenit na `undefined` a upravit docs.
- `Filesystem.readFileInChunks()` neni implementovane. Upstream Capacitor API ho ma; doplneni vyzaduje rozsirit callback-style bridge pro vestavene pluginy, nejen pridat main-process metodu.
- Deprecated `Filesystem.addListener('progress')` pro `Filesystem.downloadFile()` neni implementovany. Doporučení v docs smeruje na `@capacitor/file-transfer`, ktery progress udalosti ma.
- Linux cold-start deep link handling zustava partial. Electron helper umi running-instance `second-instance` cestu, ale cold start zavisi na `.desktop` integraci a argumentech predanych OS.
- Local Notifications jsou jen runtime/in-memory. Pokud aplikace potrebuje notifikace prezit restart, je treba perzistovat schedule v aplikaci a znovu volat `schedule()` po startu.

## Overeni

- `npm run typecheck` proslo.
- Interni markdown linky v `README.md` a `docs/*.md` prosly lokalnim checkem.
- Vsechny externi markdown odkazy v `README.md` a `docs/*.md` byly overeny pres HTTP a vracely 200.

## Poznamky

- Existujici rozpracovane zmeny v `src/template-electron/src/system/shared/types.ts` a `src/template-electron/src/system/static/capacitor-api/in-app-browser-main.ts` pridavaji `modal` podporu pro InAppBrowser. Neprepisoval jsem je; pouze jsem doplnil dokumentaci.
- Runtime OS chovani nebylo manualne testovane na macOS/Windows/Linux v playgroundu, protoze playground byl mimo rozsah zadani.
