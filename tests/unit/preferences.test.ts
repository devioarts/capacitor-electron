// Tests for preferences-main.ts (M-1 fix — async atomic write + queue)
// Uses a real temporary directory so file I/O is genuine, not mocked.
import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import * as realFs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Electron mock with mutable userData path ──────────────────────────────────

const { mockGetPath } = vi.hoisted(() => ({
  mockGetPath: vi.fn((_name: string) => '/tmp/prefs-test-default'),
}));

vi.mock('electron', () => ({
  app: { getPath: mockGetPath, getName: () => 'TestApp', on: () => {} },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  BrowserWindow: class {
    static getAllWindows() { return []; }
    isDestroyed() { return false; }
    webContents = { send: () => {} };
  },
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

const tmpDir = realFs.mkdtempSync(path.join(os.tmpdir(), 'cap-prefs-test-'));
const storeDir = path.join(tmpDir, 'CapacitorStorage', 'TestApp');
const storePath = path.join(storeDir, 'preferences.json');

// Capture IPC handlers registered by the module.
type Handler = (event: unknown, opts?: unknown) => Promise<unknown>;
const handlers = new Map<string, Handler>();

beforeAll(async () => {
  // Point electron to our tmpDir before the module initialises.
  mockGetPath.mockImplementation(() => tmpDir);

  // Capture ipcMain.handle registrations (called via registerPlugin inside the module).
  const { ipcMain } = await import('electron');
  (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
    (channel: string, fn: Handler) => handlers.set(channel, fn),
  );

  // Import the module — side effects run here (mkdirSync, readFileSync attempt).
  await import('../../src/template-electron/src/system/static/capacitor-api/preferences-main.js');
});

afterAll(() => {
  realFs.rmSync(tmpDir, { recursive: true, force: true });
});

// Trusted-sender mock event (no senderCheck set → all trusted).
const event = { senderFrame: { url: 'file:///app/index.html' } };

// Convenience wrappers that call the handler and unwrap the inner result.
// registerPlugin wraps responses — success returns the method result directly.
async function call(method: string, opts?: unknown): Promise<unknown> {
  const handler = handlers.get(`Preferences-${method}`);
  if (!handler) throw new Error(`Handler not found: Preferences-${method}`);
  return handler(event, opts);
}

// Reset store between tests so they're independent.
beforeEach(async () => {
  await call('clear');
});

// ── CRUD ──────────────────────────────────────────────────────────────────────

describe('Preferences CRUD', () => {
  it('get returns null for a missing key', async () => {
    const result = await call('get', { key: 'missing' }) as { value: string | null };
    expect(result.value).toBeNull();
  });

  it('set then get returns the stored value', async () => {
    await call('set', { key: 'name', value: 'Alice' });
    const result = await call('get', { key: 'name' }) as { value: string | null };
    expect(result.value).toBe('Alice');
  });

  it('set overwrites an existing key', async () => {
    await call('set', { key: 'x', value: 'first' });
    await call('set', { key: 'x', value: 'second' });
    const result = await call('get', { key: 'x' }) as { value: string | null };
    expect(result.value).toBe('second');
  });

  it('remove deletes a key', async () => {
    await call('set', { key: 'temp', value: '42' });
    await call('remove', { key: 'temp' });
    const result = await call('get', { key: 'temp' }) as { value: string | null };
    expect(result.value).toBeNull();
  });

  it('remove on a missing key does not throw', async () => {
    await expect(call('remove', { key: 'nope' })).resolves.toBeUndefined();
  });

  it('keys returns all stored keys', async () => {
    await call('set', { key: 'a', value: '1' });
    await call('set', { key: 'b', value: '2' });
    const result = await call('keys') as { keys: string[] };
    expect(result.keys.sort()).toEqual(['a', 'b']);
  });

  it('clear empties the store', async () => {
    await call('set', { key: 'p', value: 'q' });
    await call('clear');
    const result = await call('keys') as { keys: string[] };
    expect(result.keys).toHaveLength(0);
  });
});

// ── Persistence ───────────────────────────────────────────────────────────────

describe('Preferences persistence', () => {
  it('writes a JSON file to disk after set', async () => {
    await call('set', { key: 'disk', value: 'written' });
    // Give the async queue a moment to flush.
    await new Promise((r) => setTimeout(r, 50));
    const raw = JSON.parse(realFs.readFileSync(storePath, 'utf-8')) as Record<string, string>;
    expect(raw['disk']).toBe('written');
  });

  it('file reflects all keys after multiple sets', async () => {
    await call('set', { key: 'k1', value: 'v1' });
    await call('set', { key: 'k2', value: 'v2' });
    await new Promise((r) => setTimeout(r, 50));
    const raw = JSON.parse(realFs.readFileSync(storePath, 'utf-8')) as Record<string, string>;
    expect(raw['k1']).toBe('v1');
    expect(raw['k2']).toBe('v2');
  });

  it('file is absent (or empty) after clear', async () => {
    await call('set', { key: 'gone', value: 'yes' });
    await call('clear');
    await new Promise((r) => setTimeout(r, 50));
    const raw = JSON.parse(realFs.readFileSync(storePath, 'utf-8')) as Record<string, string>;
    expect(Object.keys(raw)).toHaveLength(0);
  });

  it('does not leave a .tmp file after a successful write', async () => {
    await call('set', { key: 'atomic', value: 'test' });
    await new Promise((r) => setTimeout(r, 100));
    const tmpFiles = realFs.readdirSync(storeDir).filter((f) => f.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });
});

// ── Concurrent writes ─────────────────────────────────────────────────────────

describe('Preferences write queue', () => {
  it('serialises concurrent writes — last write wins', async () => {
    // Fire 5 writes concurrently without awaiting.
    const writes = Array.from({ length: 5 }, (_, i) =>
      call('set', { key: 'race', value: `v${i}` }),
    );
    await Promise.all(writes);
    await new Promise((r) => setTimeout(r, 100));

    // The in-memory store should reflect the last written value.
    const result = await call('get', { key: 'race' }) as { value: string | null };
    expect(result.value).toBe('v4');

    // The file must also be consistent (no partial write / corruption).
    const raw = JSON.parse(realFs.readFileSync(storePath, 'utf-8')) as Record<string, string>;
    expect(typeof raw['race']).toBe('string');
  });
});

// ── migrate ───────────────────────────────────────────────────────────────────

describe('Preferences.migrate', () => {
  it('imports keys from CapacitorStorage. prefix', async () => {
    const ls = { 'CapacitorStorage.theme': 'dark', 'CapacitorStorage.lang': 'cs' };
    const result = await call('migrate', { __localStorage: ls }) as {
      migrated: string[];
      existing: string[];
    };
    expect(result.migrated.sort()).toEqual(['lang', 'theme']);
    expect(result.existing).toHaveLength(0);
    expect(((await call('get', { key: 'theme' })) as { value: string }).value).toBe('dark');
  });

  it('imports keys from _cap_ prefix (legacy fallback)', async () => {
    const ls = { '_cap_oldKey': 'hello' };
    const result = await call('migrate', { __localStorage: ls }) as {
      migrated: string[];
      existing: string[];
    };
    expect(result.migrated).toContain('oldKey');
  });

  it('marks keys as existing when already present in store', async () => {
    await call('set', { key: 'taken', value: 'original' });
    const ls = { 'CapacitorStorage.taken': 'overwrite?' };
    const result = await call('migrate', { __localStorage: ls }) as {
      migrated: string[];
      existing: string[];
    };
    expect(result.existing).toContain('taken');
    expect(result.migrated).not.toContain('taken');
    // Original value preserved.
    expect(((await call('get', { key: 'taken' })) as { value: string }).value).toBe('original');
  });
});
