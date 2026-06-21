// Tests for shortcuts-main.ts — normalizeAccelerator() + setupShortcuts().
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Electron mock ──────────────────────────────────────────────────────────────

const { mockIpcHandle, mockRegister, mockUnregister, mockUnregisterAll } = vi.hoisted(() => ({
  mockIpcHandle: vi.fn(),
  mockRegister: vi.fn(() => true),
  mockUnregister: vi.fn(),
  mockUnregisterAll: vi.fn(),
}));

let appQuitHandler: (() => void) | null = null;

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/tmp',
    getName: () => 'TestApp',
    quit: vi.fn(),
    on: (_event: string, handler: () => void) => { appQuitHandler = handler; },
  },
  globalShortcut: {
    register: mockRegister,
    unregister: mockUnregister,
    unregisterAll: mockUnregisterAll,
  },
  ipcMain: { handle: mockIpcHandle, on: vi.fn() },
  BrowserWindow: class {
    static getAllWindows() { return []; }
    isVisible() { return true; }
    isMinimized() { return false; }
    isMaximized() { return false; }
    isFullScreen() { return false; }
    show() {}
    hide() {}
    focus() {}
    minimize() {}
    maximize() {}
    unmaximize() {}
    setFullScreen(_v: boolean) {}
    get webContents() {
      return { send: vi.fn(), reload: vi.fn(), openDevTools: vi.fn() };
    }
  },
}));

import {
  normalizeAccelerator,
  setupShortcuts,
} from '../../src/template-electron/src/system/static/electron-api/shortcuts-main.js';

beforeEach(() => {
  mockIpcHandle.mockReset();
  mockRegister.mockReset().mockReturnValue(true);
  mockUnregister.mockReset();
  mockUnregisterAll.mockReset();
  appQuitHandler = null;
});

// ── normalizeAccelerator ───────────────────────────────────────────────────────

describe('normalizeAccelerator — valid inputs', () => {
  it('returns the accelerator unchanged for a simple key combo', () => {
    expect(normalizeAccelerator('CmdOrCtrl+K')).toBe('CmdOrCtrl+K');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeAccelerator('  CmdOrCtrl+K  ')).toBe('CmdOrCtrl+K');
  });

  it('accepts single key', () => {
    expect(normalizeAccelerator('F5')).toBe('F5');
  });

  it('accepts complex combo with Shift', () => {
    expect(normalizeAccelerator('CmdOrCtrl+Shift+P')).toBe('CmdOrCtrl+Shift+P');
  });
});

describe('normalizeAccelerator — invalid inputs', () => {
  it('returns null for non-string (number)', () => {
    expect(normalizeAccelerator(42)).toBeNull();
  });

  it('returns null for non-string (null)', () => {
    expect(normalizeAccelerator(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeAccelerator('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normalizeAccelerator('   ')).toBeNull();
  });

  it('returns null for string longer than 100 chars', () => {
    expect(normalizeAccelerator('a'.repeat(101))).toBeNull();
  });

  it('returns null for string with control characters', () => {
    expect(normalizeAccelerator('Ctrl+\x01K')).toBeNull();
  });
});

// ── setupShortcuts — IPC handler registration ─────────────────────────────────

describe('setupShortcuts — IPC handlers', () => {
  it('registers shortcuts:register handler', () => {
    setupShortcuts([], () => null);
    const channels = mockIpcHandle.mock.calls.map((c) => c[0] as string);
    expect(channels).toContain('shortcuts:register');
  });

  it('registers shortcuts:unregister handler', () => {
    setupShortcuts([], () => null);
    const channels = mockIpcHandle.mock.calls.map((c) => c[0] as string);
    expect(channels).toContain('shortcuts:unregister');
  });
});

// ── setupShortcuts — static defs ──────────────────────────────────────────────

describe('setupShortcuts — static shortcut definitions', () => {
  it('calls globalShortcut.register for each valid def', () => {
    setupShortcuts(
      [
        { accelerator: 'CmdOrCtrl+K', event: 'open-search' },
        { accelerator: 'CmdOrCtrl+Q', action: 'quit' },
      ],
      () => null,
    );
    expect(mockRegister).toHaveBeenCalledTimes(2);
  });

  it('passes the correct accelerator to globalShortcut.register', () => {
    setupShortcuts([{ accelerator: 'CmdOrCtrl+Shift+H', event: 'toggle' }], () => null);
    expect(mockRegister).toHaveBeenCalledWith('CmdOrCtrl+Shift+H', expect.any(Function));
  });

  it('skips defs with invalid accelerator (register not called for them)', () => {
    setupShortcuts(
      [
        { accelerator: '', event: 'bad' },
        { accelerator: 'CmdOrCtrl+G', event: 'good' },
      ],
      () => null,
    );
    // Only the valid one is registered
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledWith('CmdOrCtrl+G', expect.any(Function));
  });
});

// ── setupShortcuts — will-quit unregisters all ────────────────────────────────

describe('setupShortcuts — app will-quit cleanup', () => {
  it('unregisters all shortcuts on will-quit', () => {
    setupShortcuts([], () => null);
    expect(appQuitHandler).not.toBeNull();
    appQuitHandler!();
    expect(mockUnregisterAll).toHaveBeenCalledTimes(1);
  });
});

// ── shortcuts:register dynamic IPC handler ────────────────────────────────────

describe('shortcuts:register IPC handler', () => {
  it('registers a new shortcut from renderer and returns true', () => {
    setupShortcuts([], () => null);
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'shortcuts:register',
    )?.[1] as (_e: unknown, def: { accelerator: string; event: string }) => boolean;
    const result = handler({}, { accelerator: 'CmdOrCtrl+L', event: 'open-log' });
    expect(result).toBe(true);
    expect(mockRegister).toHaveBeenCalledWith('CmdOrCtrl+L', expect.any(Function));
  });

  it('returns false for a def with empty event string', () => {
    setupShortcuts([], () => null);
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'shortcuts:register',
    )?.[1] as (_e: unknown, def: { accelerator: string; event: string }) => boolean;
    const result = handler({}, { accelerator: 'CmdOrCtrl+L', event: '' });
    expect(result).toBe(false);
    expect(mockRegister).not.toHaveBeenCalled();
  });
});

// ── shortcuts:unregister dynamic IPC handler ──────────────────────────────────

describe('shortcuts:unregister IPC handler', () => {
  it('calls globalShortcut.unregister with the normalized accelerator', () => {
    setupShortcuts([], () => null);
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'shortcuts:unregister',
    )?.[1] as (_e: unknown, accelerator: string) => void;
    handler({}, 'CmdOrCtrl+K');
    expect(mockUnregister).toHaveBeenCalledWith('CmdOrCtrl+K');
  });

  it('does NOT call unregister for invalid accelerator', () => {
    setupShortcuts([], () => null);
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'shortcuts:unregister',
    )?.[1] as (_e: unknown, accelerator: string) => void;
    handler({}, '');
    expect(mockUnregister).not.toHaveBeenCalled();
  });
});
