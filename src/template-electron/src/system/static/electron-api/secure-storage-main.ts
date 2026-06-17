import { app, ipcMain, safeStorage } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

type SecureStore = Record<string, string>;

function storePath(): string {
  return path.join(app.getPath('userData'), 'CapacitorStorage', 'secure-storage.json');
}

async function readStore(): Promise<SecureStore> {
  try {
    return JSON.parse(await fs.readFile(storePath(), 'utf-8')) as SecureStore;
  } catch {
    return {};
  }
}

async function writeStore(store: SecureStore): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
}

function backend(): string {
  const fn = (safeStorage as unknown as { getSelectedStorageBackend?: () => string }).getSelectedStorageBackend;
  return typeof fn === 'function' ? fn.call(safeStorage) : process.platform;
}

async function encrypt(value: string): Promise<string> {
  const api = safeStorage as unknown as { encryptStringAsync?: (plainText: string) => Promise<Buffer> };
  const buf = typeof api.encryptStringAsync === 'function'
    ? await api.encryptStringAsync(value)
    : safeStorage.encryptString(value);
  return buf.toString('base64');
}

async function decrypt(value: string): Promise<string> {
  const buf = Buffer.from(value, 'base64');
  const api = safeStorage as unknown as { decryptStringAsync?: (encrypted: Buffer) => Promise<{ result: string; shouldReEncrypt?: boolean }> };
  if (typeof api.decryptStringAsync === 'function') {
    return (await api.decryptStringAsync(buf)).result;
  }
  return safeStorage.decryptString(buf);
}

ipcMain.handle('secureStorage:isEncryptionAvailable', () => safeStorage.isEncryptionAvailable());
ipcMain.handle('secureStorage:getSelectedStorageBackend', () => backend());

ipcMain.handle('secureStorage:set', async (_e, opts: { key: string; value: string }) => {
  if (!opts?.key) throw new Error('secureStorage.set requires a key');
  const store = await readStore();
  store[opts.key] = await encrypt(String(opts.value ?? ''));
  await writeStore(store);
});

ipcMain.handle('secureStorage:get', async (_e, key: string) => {
  if (!key) throw new Error('secureStorage.get requires a key');
  const store = await readStore();
  const value = store[key];
  return value == null ? null : await decrypt(value);
});

ipcMain.handle('secureStorage:remove', async (_e, key: string) => {
  const store = await readStore();
  delete store[key];
  await writeStore(store);
});

ipcMain.handle('secureStorage:clear', async () => {
  await writeStore({});
});

ipcMain.handle('secureStorage:keys', async () => Object.keys(await readStore()));

ipcMain.handle('secureStorage:encryptString', async (_e, value: string) => encrypt(String(value ?? '')));
ipcMain.handle('secureStorage:decryptString', async (_e, value: string) => decrypt(String(value ?? '')));
