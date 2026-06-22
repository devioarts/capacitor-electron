import * as fs from 'fs';
import * as path from 'path';

type JsonRecord = Record<string, unknown>;

export interface AppMeta {
  appName: string;
  appId: string;
}

export interface ElectronPackageMetadata {
  appMeta: AppMeta;
  packageName: string;
  packageJson: JsonRecord;
}

const ROOT_METADATA_KEYS = [
  'version',
  'description',
  'author',
  'homepage',
  'license',
  'repository',
  'bugs',
] as const;

export function readAppMeta(root: string): AppMeta {
  if (process.env['CAPACITOR_CONFIG']) {
    try {
      const cfg = JSON.parse(process.env['CAPACITOR_CONFIG']) as { appName?: string; appId?: string };
      if (cfg.appId && cfg.appName) return { appName: cfg.appName, appId: cfg.appId };
    } catch { /* fall through */ }
  }

  const jsonCfg = path.join(root, 'capacitor.config.json');
  if (fs.existsSync(jsonCfg)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(jsonCfg, 'utf-8')) as { appName?: string; appId?: string };
      if (cfg.appId || cfg.appName) {
        return { appName: cfg.appName ?? 'app', appId: cfg.appId ?? 'com.example.app' };
      }
    } catch { /* fall through */ }
  }

  for (const ext of ['ts', 'js']) {
    const cfgFile = path.join(root, `capacitor.config.${ext}`);
    if (!fs.existsSync(cfgFile)) continue;
    try {
      const src = fs.readFileSync(cfgFile, 'utf-8');
      const appId = src.match(/appId\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];
      const appName = src.match(/appName\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];
      if (appId || appName) {
        return { appName: appName ?? 'app', appId: appId ?? 'com.example.app' };
      }
    } catch { /* fall through */ }
  }

  const rootPkg = readJson(path.join(root, 'package.json'));
  return {
    appName: stringOrUndefined(rootPkg?.['name']) ?? 'app',
    appId: 'com.example.app',
  };
}

export function collectElectronPackageMetadata(root: string): ElectronPackageMetadata {
  const rootPkg = readJson(path.join(root, 'package.json')) ?? {};
  const appMeta = readAppMeta(root);
  const rootPackageName = stringOrUndefined(rootPkg['name']);
  const packageName = toNpmPackageName(
    ...(isGenericAppPackageName(rootPackageName)
      ? [appMeta.appName, rootPackageName]
      : [rootPackageName, appMeta.appName]),
    appMeta.appId,
  );

  const packageJson: JsonRecord = {
    name: packageName,
    productName: appMeta.appName,
    desktopName: packageName,
  };

  for (const key of ROOT_METADATA_KEYS) {
    if (rootPkg[key] !== undefined) packageJson[key] = rootPkg[key];
  }

  return { appMeta, packageName, packageJson };
}

export function syncElectronPackageMetadata(
  root: string,
  electronPkgPath: string,
  electronLockPath?: string,
): boolean {
  const metadata = collectElectronPackageMetadata(root);
  let changed = mergePackageMetadata(electronPkgPath, metadata.packageJson);
  if (electronLockPath) {
    changed = mergePackageLockMetadata(electronLockPath, metadata.packageJson) || changed;
  }
  return changed;
}

export function mergePackageMetadata(pkgPath: string, metadata: JsonRecord): boolean {
  const existing = readJson(pkgPath);
  if (!existing) return false;
  const next = { ...existing, ...metadata };
  return writeJsonIfChanged(pkgPath, existing, next);
}

export function mergePackageLockMetadata(lockPath: string, metadata: JsonRecord): boolean {
  const existing = readJson(lockPath);
  if (!existing) return false;

  const next: JsonRecord = { ...existing };
  for (const key of ['name', 'version'] as const) {
    if (metadata[key] !== undefined) next[key] = metadata[key];
  }

  if (isRecord(existing['packages'])) {
    const packages = { ...existing['packages'] };
    const rootPackage = isRecord(packages['']) ? { ...packages[''] } : {};
    for (const key of ['name', 'version', 'license'] as const) {
      if (metadata[key] !== undefined) rootPackage[key] = metadata[key];
    }
    packages[''] = rootPackage;
    next['packages'] = packages;
  }

  return writeJsonIfChanged(lockPath, existing, next);
}

export function toNpmPackageName(...candidates: Array<string | undefined>): string {
  for (const candidate of [...candidates, 'app']) {
    if (!candidate) continue;
    const safe = candidate
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._@/~-]+/g, '-')
      .replace(/[-._]{2,}/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 214);

    if (safe) return safe;
  }

  return 'app';
}

function readJson(file: string): JsonRecord | null {
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeJsonIfChanged(file: string, before: JsonRecord, after: JsonRecord): boolean {
  const beforeJson = JSON.stringify(before, null, 2) + '\n';
  const afterJson = JSON.stringify(after, null, 2) + '\n';
  if (beforeJson === afterJson) return false;
  fs.writeFileSync(file, afterJson);
  return true;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function isGenericAppPackageName(value: string | undefined): boolean {
  return value === 'app';
}
