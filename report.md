# Code Review Report — capacitor-electron

> Datum: 2026-06-20  
> Verze: Electron 42, Capacitor 8, esbuild bundle  
> Scope: Veškerý zdrojový kód kromě složky `playground/`  
> Zaměření: stabilita, funkčnost, soulad s oficiální dokumentací Electron/Capacitor/electron-builder

---

## Přehled

Codebase je celkově dobře strukturovaný. Bezpečnostní model (contextIsolation, IPC sender check, path traversal guard) je solidní. Klíčové problémy se týkají konkrétních edge cases v implementacích pluginů a jedné dokumentační chyby, která může vést k tiché konfigurační chybě.

---

## 🔴 Kritické

### 1. Race condition při stahování souborů — `downloads-main.ts:88` ✅ opraveno

**Původní problém:** Systém párování stažení používal `pending.shift()` — globální FIFO frontu. Předpokládal, že `will-download` event přijde ve stejném pořadí, v jakém byly volány `downloadURL()`. Electron toto nezaručuje — pokud dvě `downloadURL()` volání přijdou souběžně nebo z různých WebContents, pořadí `will-download` eventů nemusí odpovídat. Výsledek: metadata (URL, savePath, id) jednoho stahování se mohla přiřadit k jinému.

```ts
// downloads-main.ts:88
const next = pending.shift(); // FIFO — nezaručené pořadí
if (!next) return;
attachDownload(owner, item, next);
```

**Stav:** Nahrazeno mapou `Map<string, DownloadState[]>` podle normalizované URL. `will-download` páruje přes `item.getURL()`. FIFO zůstává pouze uvnitř stejné URL; URL se neupravuje interním query parametrem, aby se nerozbily signed URLs nebo server-side cache pravidla.

---

### 2. Chybná cesta `resourcePath()` v dev módu — `file-viewer-main.ts:17` ✅ opraveno

**Problém:** Funkce `resourcePath()` pro dev mód (non-packaged) používá:

```ts
const base = path.join(__dirname, '..', '..', '..', '..', 'app');
```

Po bundlování esbuild do `dist/main.cjs` je `__dirname = <electronDir>/dist`. Čtyři `../` by šly daleko nad adresář `electron/` — konkrétně na `grandparent/` projektu. Všechna ostatní použití `__dirname` v projektu používají jednotně **jedno** `../` pro navigaci z `dist/` do `electron/`:

```ts
// splash-main.ts:33 — správně
const abs = path.join(__dirname, '..', 'assets', image);

// tray-main.ts:43 — správně
const abs = path.join(__dirname, '..', 'assets', iconSrc as string);
```

Správný dev path by měl být: `path.join(__dirname, '..', 'app')` (jeden level nahoru z `dist/` = `electron/app/`).

**Dopad:** `FileViewer.openDocumentFromResources()` v dev módu vždy selže nebo otevře nesprávný soubor.

**Stav:** Dev path opraven na `path.join(__dirname, '..', 'app')`.

---

## 🟠 Vysoké

### 3. `windows:openExternal` bez whitelist protokolů — `windows-main.ts:109` ✅ opraveno

**Problém:** IPC handler `windows:openExternal` jen parsuje URL a bez dalších kontrol volá `shell.openExternal()`:

```ts
ipcMain.handle('windows:openExternal', async (_e, url: string) => {
  await shell.openExternal(new URL(url).href); // žádný allowlist
});
```

Naproti tomu `protocol-main.ts:openExternal` správně kontroluje povolené protokoly (`http:`, `https:`, `mailto:`, konfigurovaná schémata). Přes `windows:openExternal` může renderer otevřít libovolný protokol včetně `file://` nebo nestandardních schémat.

**Navrhované řešení:** Stejná filtrace jako v `protocol-main.ts` — povolovat jen `http:`, `https:`, `mailto:` a konfigurovatelná schémata.

**Stav:** `windows:openExternal` používá společný web URL helper s `windows:create` a povoluje jen `http:` / `https:`. Custom schémata zůstávají přes explicitní `protocol:openExternal`.

---

### 4. HTML injection v splash buildHTML — `splash-main.ts:76` ✅ opraveno

**Původní problém:** Hodnota `backgroundColor` z `capacitor.config.json` se vkládala přímo do inline HTML bez escapování:

```ts
function buildHTML(bg: string, imageUrl: string): string {
  return `...background:${bg};...`;
}
```

Pokud config obsahuje hodnotu jako `#fff;}</style><script>malicious()</script><style>`, HTML struktura by se rozbila. Jde o konfigurační riziko (ne přímý user-facing útok), ale config může být modifikován při build procesu nebo CI pipeline.

**Stav:** Barva se už nevkládá do inline HTML. Splash HTML má transparentní background, `backgroundColor` se validuje/normalizuje a aplikuje přes `BrowserWindow.backgroundColor` / `setBackgroundColor()`. Neplatné hodnoty padají zpět na `#ffffff`.

---

### 5. Race condition při souběžných zápisech do secure storage — `secure-storage-main.ts:19-24` ✅ opraveno

**Problém:** `readStore()` a `writeStore()` jsou async bez žádného zamykání. Dvě souběžná `secureStorage:set` volání přečtou stejný stav, oba ho upraví, oba zapíší zpět — druhý zápis přepíše změny prvního.

```ts
// Dvě souběžná volání:
const store = await readStore(); // oba přečtou stejný obsah
store[opts.key] = await encrypt(...);
await writeStore(store); // druhý zápis přepíše první
```

**Navrhované řešení:** Serializovat zápisy přes jednoduchou frontu slibů (promise queue / mutex). Alternativně použít synchronní `fs.readFileSync`/`fs.writeFileSync` a zpracovávat IPC handlery synchronně (přes `ipcMain.on` + `event.returnValue`), nebo použít `electron-store` knihovnu.

**Stav:** Přidána promise queue kolem `set/get/remove/clear/keys`, aby čtení i zápisy viděly konzistentní stav backing JSON store.

---

## 🟡 Střední

### 6. Neoznámený external HTTP request v Network pluginu — `network-main.ts:19` ✅ opraveno

**Původní problém:** Funkce `probeNetwork()` posílala `HEAD https://capacitorjs.com/` při každém volání `getStatus()` a každých 10 sekund při aktivním listeneru:

```ts
await fetch('https://capacitorjs.com/', { method: 'HEAD', signal: controller.signal });
```

Problémy:
- Neoznámený request třetí strany viditelný v síťovém provozu uživatele (privacy)
- Tvrdě zakódovaná URL — pokud capacitorjs.com není dostupný, plugin nesprávně hlásí `connected: false` i při funkční síti
- Timeout 3 s blokuje `getStatus()` na 3 sekundy při každém volání
- Dokumentace `docs/network.md` se o tomto probing nezmiňuje

**Stav:** Probe odstraněn. Network plugin používá pouze Electron/Chromium `net.isOnline()` a dokumentace explicitně uvádí, že se neprovádí žádný external HTTP probe.

---

### 7. `App.getState().isActive` — Electron používá focus semantics — `app-main.ts:36`

**Problém:** Implementace:
```ts
async getState(): Promise<{ isActive: boolean }> {
  const win = getMainWindow();
  return { isActive: !!win && !win.isMinimized() && win.isFocused() };
}
```

Capacitor API dokumentace definuje `isActive` jako „whether the app is active/in the foreground." Aplikace může být viditelná a v popředí bez toho, aby měla keyboard focus (uživatel přejde do jiné aplikace a vrátí se, nebo klikne na jiné okno v jiné aplikaci). V takovém případě by `isActive` mělo být `true`, ale `isFocused()` vrátí `false`.

**Stav:** Neopravovat kódem. Na desktopu je pro tento projekt záměrné mapování na focus semantics (`!isMinimized() && isFocused()`), blíže mobilnímu “aktivní aplikace” modelu. `docs/app.md` uvádí, že `isActive` znamená fokusované hlavní okno.

---

### 8. `setUncaughtExceptionCaptureCallback` — dokumentovaný ownership hooku — `process-guardian.ts:16`

**Upřesnění:** `process.setUncaughtExceptionCaptureCallback()` je exkluzivní — druhé volání vyhodí `ERR_UNCAUGHT_EXCEPTION_CAPTURE_ALREADY_SET`. V tomto projektu je ale exkluzivní ownership záměr: `process-guardian` centrálně zachytává main-process výjimky a forwarduje je rendereru přes `window.Electron.onElectronError()`.

**Stav:** Neopravovat změnou kódu. Doplnit dokumentaci, že uživatelské pluginy a knihovny nemají volat `setUncaughtExceptionCaptureCallback()` a mají používat `process.on('uncaughtException', ...)`, `process.on('unhandledRejection', ...)` nebo vlastní plugin-level error reporting.

---

### 9. Auto-launch: Linux nepodporován, ale bez varování — `auto-launch-main.ts` ✅ opraveno

**Původní problém:** Electron login item settings jsou podporované na macOS a Windows. Na Linuxu je `app.setLoginItemSettings()` no-op a `app.getLoginItemSettings().openAtLogin` typicky vrací `false`. Implementace toto nedetekovala a nehlásila:

```ts
ipcMain.handle('autoLaunch:setEnabled', (_e, enabled: boolean) => {
  app.setLoginItemSettings({ openAtLogin: enabled === true }); // no-op na Linuxu
  return app.getLoginItemSettings().openAtLogin; // vždy false na Linuxu
});
```

**Stav:** Linux je explicitně no-op: `isEnabled()` i `setEnabled()` vrací `false`. Dokumentace uvádí, že auto launch je podporovaný přes Electron login item settings pouze na macOS a Windows.

---

### 10. Accelerator stringu ve `shortcuts:register` není validován — `shortcuts-main.ts:110` ✅ opraveno

**Původní problém:** `ipcMain.handle('shortcuts:register', ...)` bral `accelerator` string přímo z rendereru a předával ho do `globalShortcut.register()` bez jakékoliv validace. Chybný accelerator mohl způsobit interní výjimku v Electronu.

**Stav:** Přidána lehká validace typu/délky/control znaků a `globalShortcut.register()` je obalený `try/catch`. Neplatný nebo obsazený accelerator vrací `false`. Záměrně nepoužit obří whitelist regex, protože Electron accelerator syntaxe je širší a křehký regex by časem odmítal validní zkratky.

---

### 11. Listener se nezaregistruje, pokud okno neexistuje při `attachWindowListeners()` — `app-main.ts:58-70` ✅ opraveno

**Problém:** `attachWindowListeners()` volá `getMainWindow()` = `BrowserWindow.getAllWindows()[0]`. Pokud je volána před vytvořením okna, `win` je `undefined`, focus/blur handlery se nevytvoří, ale `listenCount` je inkrementován. Každé další `addListener` ho zdvojnásobuje. Při `removeListener`: `listenCount` klesne, ale real handlery nikdy nevznikly — `win.removeListener` dostane `null`.

V praxi renderer běží po `app.whenReady()` a okno existuje, ale edge case zůstává.

**Stav:** Ref-count listenerů je oddělený od fyzicky připojeného okna. Pokud listener existuje dřív než okno, handlery se dopojí při `browser-window-created`; pokud se okno zavře, další okno se umí připojit znovu.

---

## 🟢 Nízké

### 12. Neomezený `delivered` array v LocalNotifications — `local-notifications-main.ts:29` ✅ opraveno

`delivered` roste s každou odeslanou notifikací bez horní hranice. Dlouhodobě běžící aplikace s mnoha notifikacemi akumuluje data v paměti.

**Návrh:** Omezit na posledních N notifikací (např. 200), nebo je automaticky mazat po určité době.

**Stav:** `delivered` se omezuje na posledních 200 notifikací.

---

### 13. Synchronní I/O v Preferences při každém zápisu — `preferences-main.ts:31` ⏸️ ponecháno

`fs.writeFileSync` blokuje event loop hlavního procesu při každém `set()`, `remove()`, `clear()`. Na pomalých discích nebo síťových mountech způsobí patrné zpoždění IPC odpovědí.

**Návrh:** Debounce persist (např. 200 ms) nebo přechod na `fs.promises.writeFile` s mutex frontou (viz issue #5).

**Stav:** Nechat jako future performance improvement. Aktuální synchronní write-through chování je jednoduché a předvídatelné; bez reálného performance problému se teď nebude komplikovat debounce/mutexem.

---

### 14. Dead code při inicializaci `downloads-main.ts` — `downloads-main.ts:94` ✅ opraveno

```ts
BrowserWindow.getAllWindows().forEach(ensureSession);
```

Tato linka se volá při importu modulu (před `app.whenReady()`), kdy žádné okno neexistuje. Vždy je no-op. Skutečná registrace session probíhá přes `downloads:ensureSession` IPC z preloadu.

**Stav:** No-op inicializační řádek odstraněn při opravě downloads párování.

---

### 15. Zbytečná wrapper funkce `menuContext()` — `menu-main.ts:149` ✅ opraveno

Privátní funkce `menuContext()` je jen alias pro exportovanou `createMenuContext()` bez přidané hodnoty. Přispívá k zbytečnému kogitivnímu zatížení.

**Stav:** Wrapper odstraněn, volání používají přímo `createMenuContext()`.

---

### 16. `Device.getInfo().operatingSystem` vrací `'unknown'` na Linuxu — `device-main.ts:12` ✅ zdokumentováno

Capacitor Device API nepokrývá Linux v enum `OperatingSystem` (jen `ios|android|windows|mac|unknown`). Vrácení `'unknown'` je technicky korektní, ale mohlo by být zdokumentováno.

**Stav:** `docs/device.md` explicitně uvádí, že Linux vrací `operatingSystem: 'unknown'`, protože Capacitor enum nemá Linux hodnotu.

---

## 📄 Dokumentace

### D1. Chybný konfigurační klíč v `docs/preferences.md:14` ✅ opraveno

**Kritická chyba v dokumentaci:** Příklad v docs ukazuje:

```typescript
plugins: {
  Electron: {
    capacitor: {      // ← ŠPATNĚ
      preferences: false,
    },
  },
}
```

Správný klíč dle `types.ts` (`interface ElectronConfig`) a kódu `preferences-main.ts` je `capacitorPlugins`:

```typescript
plugins: {
  Electron: {
    capacitorPlugins: {  // ← SPRÁVNĚ
      preferences: false,
    },
  },
}
```

**Dopad:** Uživatelé kteří zkopírují příklad z docs, uvidí klíč `capacitor` tiše ignorován — Preferences plugin bude aktivní i přes nastavení `false`. Funkční chyba.

**Stav:** Dokumentace používá správný klíč `capacitorPlugins`.

---

### D2. `docs/network.md` nezmiňuje external HTTP probe — `network.md` ✅ opraveno

Probe byl odstraněn. `docs/network.md` teď explicitně uvádí, že Network plugin používá `net.isOnline()` a neprovádí žádný external HTTP probe.

---

### D3. `docs/deep-linking.md`: registrace protokolu v dev módu probíhá vždy — `deep-link-main.ts:26` ✅ zdokumentováno

Docs: _"V production to happens at launch. In development it also registers but prints a warning."_  
Kód: `app.setAsDefaultProtocolClient(scheme)` se volá bez podmínky. Toto může způsobit konflikt s jinými projekty sdílejícími stejné schéma v dev módu. Docs to uvádějí v Notes, ale výraznější varování by bylo na místě.

**Stav:** `docs/deep-linking.md` nyní výrazněji upozorňuje, že dev registrace může přesouvat OS handler mezi lokálními projekty a doporučuje unikátní dev schéma.

---

### D4. `Browser` plugin: `hasEvents: true` v electron-init.js ale žádné eventy se neodesílají ✅ zdokumentováno

V `electron-init.js`: `ph('Browser', ['open','close','getSnapshot'], true)` — `true` znamená, že PluginHeaders zahrnují `addListener/removeListener`. Ale `browser-main.ts` registruje plugin bez parametru `events`:

```ts
registerPlugin('Browser', new Browser() as unknown as AnyRecord, ['open', 'close', 'getSnapshot']);
// žádný ipcMain.on('event-add-Browser', ...) neexistuje
```

Výsledek: `Browser.addListener('browserFinished', ...)` se zaregistruje na straně rendereru, ale event nikdy nepřijde a `event-add-Browser` zpráva jde do prázdna. Komentář v kódu to zmiňuje, ale v `docs/browser.md` není zmínka — vývojáři mohou zbytečně debugovat proč event nefunguje.

**Stav:** Ponecháno kvůli kompatibilitě s upstream `@capacitor/browser` API. Capacitor v8 docs uvádí `browserFinished` a `browserPageLoaded` jako Android/iOS-only eventy; Electron je přes `shell.openExternal` neumí pozorovat. `docs/browser.md` toto explicitně vysvětluje.

---

## Souhrn

| Stav | Položky |
|------|--------|
| ✅ Opraveno / zdokumentováno / upřesněno | #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12, #14, #15, #16, D1, D2, D3, D4 |
| ⏸️ Ponecháno jako future improvement | #13 |

### Prioritizace oprav

1. **Zbývá jen sledovat:** #13 (Preferences sync I/O) jako případný performance improvement, pokud se objeví reálný problém.
