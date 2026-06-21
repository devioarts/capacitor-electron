// Tests for secure-storage-main.ts (M-2 fix — key mode plain vs hashed)
// safeStorage is mocked (OS keychain not available in test env).
// File I/O uses a real temporary directory.
import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import * as realFs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGetPath, mockGetName } = vi.hoisted(() => ({
  mockGetPath: vi.fn((_n: string) => '/tmp/ss-default'),
  mockGetName: vi.fn(() => 'TestApp'),
}));

// Simple XOR-based fake encryption so we can verify round-trips without a real keychain.
const fakeEncrypt = (s: string) => Buffer.from(s.split('').map((c) => c.charCodeAt(0) ^ 0x42));
const fakeDecrypt = (b: Buffer) => b.map((byte) => byte ^ 0x42).reduce((acc, c) => acc + String.fromCharCode(c), '');

vi.mock('electron', () => ({
  app: { getPath: mockGetPath, getName: mockGetName, on: () => {} },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  BrowserWindow: class {
    static getAllWindows() { return []; }
    isDestroyed() { return false; }
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => fakeEncrypt(s),
    decryptString: (b: Buffer) => fakeDecrypt(b),
  },
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

const tmpDir = realFs.mkdtempSync(path.join(os.tmpdir(), 'cap-ss-test-'));

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>;
const handlers = new Map<string, Handler>();

beforeAll(async () => {
  mockGetPath.mockImplementation(() => tmpDir);

  const { ipcMain } = await import('electron');
  (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
    (channel: string, fn: Handler) => handlers.set(channel, fn),
  );

  await import('../../src/template-electron/src/system/static/electron-api/secure-storage-main.js');
});

afterAll(() => {
  realFs.rmSync(tmpDir, { recursive: true, force: true });
});

const event = { senderFrame: { url: 'file:///app/index.html' } };

async function call(method: string, ...args: unknown[]): Promise<unknown> {
  const handler = handlers.get(`secureStorage:${method}`);
  if (!handler) throw new Error(`Handler not found: secureStorage:${method}`);
  return handler(event, ...args);
}

beforeEach(async () => {
  await call('clear');
});

// ── storageKey (M-2 fix — key mode) ──────────────────────────────────────────

describe('storageKey (key mode)', () => {
  it('plain mode stores key as-is (default)', async () => {
    // In plain mode, storageKey('myKey') === 'myKey'
    // Verified indirectly: set 'myKey', then file contains 'myKey' as JSON key.
    await call('set', { key: 'myKey', value: 'hello' });
    await new Promise((r) => setTimeout(r, 50));

    const storePath = path.join(tmpDir, 'CapacitorStorage', 'secure-storage.json');
    const raw = JSON.parse(realFs.readFileSync(storePath, 'utf-8')) as Record<string, string>;
    expect(Object.keys(raw)).toContain('myKey');
  });

  it('storageKey export returns the raw key in plain mode', async () => {
    // Direct test of the exported function.
    const { storageKey } = await import(
      '../../src/template-electron/src/system/static/electron-api/secure-storage-main.js'
    );
    expect(storageKey('hello')).toBe('hello');
    expect(storageKey('user-auth-token')).toBe('user-auth-token');
  });

  it('values are stored encrypted (not plaintext)', async () => {
    await call('set', { key: 'secret', value: 'plaintext-value' });
    await new Promise((r) => setTimeout(r, 50));

    const storePath = path.join(tmpDir, 'CapacitorStorage', 'secure-storage.json');
    const raw = JSON.parse(realFs.readFileSync(storePath, 'utf-8')) as Record<string, string>;
    // Value should be base64-encoded encrypted data, not the plaintext.
    expect(raw['secret']).not.toBe('plaintext-value');
    // Verify it is base64.
    expect(() => Buffer.from(raw['secret'] ?? '', 'base64')).not.toThrow();
  });
});

// ── CRUD ──────────────────────────────────────────────────────────────────────

describe('SecureStorage CRUD', () => {
  it('get returns null for a missing key', async () => {
    expect(await call('get', 'nonexistent')).toBeNull();
  });

  it('set then get round-trips the value', async () => {
    await call('set', { key: 'token', value: 'abc123' });
    expect(await call('get', 'token')).toBe('abc123');
  });

  it('set overwrites an existing value', async () => {
    await call('set', { key: 'k', value: 'first' });
    await call('set', { key: 'k', value: 'second' });
    expect(await call('get', 'k')).toBe('second');
  });

  it('remove deletes a key', async () => {
    await call('set', { key: 'del', value: 'bye' });
    await call('remove', 'del');
    expect(await call('get', 'del')).toBeNull();
  });

  it('clear removes all keys', async () => {
    await call('set', { key: 'a', value: '1' });
    await call('set', { key: 'b', value: '2' });
    await call('clear');
    expect(await call('get', 'a')).toBeNull();
    expect(await call('get', 'b')).toBeNull();
  });

  it('isEncryptionAvailable returns the safeStorage value', async () => {
    expect(await call('isEncryptionAvailable')).toBe(true);
  });

  it('getSelectedStorageBackend returns a string', async () => {
    const backend = await call('getSelectedStorageBackend');
    expect(typeof backend).toBe('string');
  });

  it('set throws when key is empty', async () => {
    await expect(call('set', { key: '', value: 'x' })).rejects.toThrow();
  });

  it('get throws when key is empty', async () => {
    await expect(call('get', '')).rejects.toThrow();
  });
});

// ── Persistence ───────────────────────────────────────────────────────────────

describe('SecureStorage persistence', () => {
  it('writes encrypted data to JSON file', async () => {
    await call('set', { key: 'persist', value: 'check' });
    await new Promise((r) => setTimeout(r, 50));

    const storePath = path.join(tmpDir, 'CapacitorStorage', 'secure-storage.json');
    expect(realFs.existsSync(storePath)).toBe(true);
    const raw = JSON.parse(realFs.readFileSync(storePath, 'utf-8')) as Record<string, string>;
    // Key is present; value is encrypted (base64), not plaintext.
    expect(typeof raw['persist']).toBe('string');
    expect(raw['persist']).not.toBe('check');
  });

  it('file permissions are 0o600 (owner read/write only)', async () => {
    await call('set', { key: 'perm', value: 'test' });
    await new Promise((r) => setTimeout(r, 50));

    const storePath = path.join(tmpDir, 'CapacitorStorage', 'secure-storage.json');
    const stat = realFs.statSync(storePath);
    // eslint-disable-next-line no-bitwise
    expect(stat.mode & 0o777).toBe(0o600);
  });
});

// ── Queue serialisation ───────────────────────────────────────────────────────

describe('SecureStorage write queue', () => {
  it('concurrent writes do not corrupt the store', async () => {
    const writes = Array.from({ length: 5 }, (_, i) =>
      call('set', { key: `concurrent-${i}`, value: `value-${i}` }),
    );
    await Promise.all(writes);
    await new Promise((r) => setTimeout(r, 100));

    // All keys should be readable after the queue flushes.
    for (let i = 0; i < 5; i++) {
      expect(await call('get', `concurrent-${i}`)).toBe(`value-${i}`);
    }
  });
});
