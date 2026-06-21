// Tests for network-main.ts — sameStatus() and getNetworkStatus().
// network-main.ts has top-level registerPlugin() call → dynamic import.
import { vi, describe, it, expect, beforeAll } from 'vitest';

// ── Electron mock ──────────────────────────────────────────────────────────────

const { mockIsOnline } = vi.hoisted(() => ({
  mockIsOnline: vi.fn(() => true),
}));

vi.mock('electron', () => ({
  net: { isOnline: mockIsOnline },
  app: { getPath: () => '/tmp', getName: () => 'TestApp', on: () => {} },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  BrowserWindow: class { static getAllWindows() { return []; } },
}));

let getNetworkStatus: () => { connected: boolean; connectionType: string };
let sameStatus: (a: { connected: boolean; connectionType: string } | null, b: { connected: boolean; connectionType: string }) => boolean;

beforeAll(async () => {
  const mod = await import('../../src/template-electron/src/system/static/capacitor-api/network-main.js');
  getNetworkStatus = mod.getNetworkStatus;
  sameStatus = mod.sameStatus;
});

// ── getNetworkStatus ───────────────────────────────────────────────────────────

describe('getNetworkStatus', () => {
  it('returns connected=true and connectionType="unknown" when online', () => {
    mockIsOnline.mockReturnValue(true);
    const status = getNetworkStatus();
    expect(status.connected).toBe(true);
    expect(status.connectionType).toBe('unknown');
  });

  it('returns connected=false and connectionType="none" when offline', () => {
    mockIsOnline.mockReturnValue(false);
    const status = getNetworkStatus();
    expect(status.connected).toBe(false);
    expect(status.connectionType).toBe('none');
  });

  it('calls net.isOnline() exactly once per invocation', () => {
    mockIsOnline.mockReset().mockReturnValue(true);
    getNetworkStatus();
    expect(mockIsOnline).toHaveBeenCalledTimes(1);
  });
});

// ── sameStatus ─────────────────────────────────────────────────────────────────

describe('sameStatus', () => {
  it('returns false when a is null', () => {
    expect(sameStatus(null, { connected: true, connectionType: 'unknown' })).toBe(false);
  });

  it('returns true when connected and type both match', () => {
    const a = { connected: true, connectionType: 'unknown' };
    const b = { connected: true, connectionType: 'unknown' };
    expect(sameStatus(a, b)).toBe(true);
  });

  it('returns false when connected differs', () => {
    expect(sameStatus(
      { connected: true,  connectionType: 'unknown' },
      { connected: false, connectionType: 'none' },
    )).toBe(false);
  });

  it('returns false when connectionType differs', () => {
    expect(sameStatus(
      { connected: true, connectionType: 'unknown' },
      { connected: true, connectionType: 'wifi' },
    )).toBe(false);
  });

  it('returns false when only connectionType differs (connected same)', () => {
    expect(sameStatus(
      { connected: false, connectionType: 'none' },
      { connected: false, connectionType: 'unknown' },
    )).toBe(false);
  });
});
