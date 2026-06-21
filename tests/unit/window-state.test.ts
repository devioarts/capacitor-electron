// Tests for window-state.ts — loadWindowState and trackWindowState
// Uses real tmpDir for file I/O; mocks screen.getAllDisplays for off-screen checks.
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as realFs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGetAllDisplays, mockGetPath } = vi.hoisted(() => ({
  mockGetAllDisplays: vi.fn(() => [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }]),
  mockGetPath: vi.fn((_: string) => '/tmp/default'),
}));

vi.mock('electron', () => ({
  app: { getPath: mockGetPath, getName: () => 'TestApp', on: () => {} },
  screen: { getAllDisplays: mockGetAllDisplays },
  BrowserWindow: class {
    static getAllWindows() { return []; }
    isDestroyed() { return false; }
  },
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

import { loadWindowState, trackWindowState } from '../../src/template-electron/src/system/static/electron-api/window-state.js';
import type { ElectronConfig } from '../../src/template-electron/src/system/shared/types.js';

const tmpDir = realFs.mkdtempSync(path.join(os.tmpdir(), 'cap-wstate-'));
mockGetPath.mockReturnValue(tmpDir);

function stateFile(): string { return path.join(tmpDir, 'window-state.json'); }

function writeState(state: object): void {
  realFs.writeFileSync(stateFile(), JSON.stringify(state), 'utf-8');
}

function readState(): Record<string, unknown> {
  return JSON.parse(realFs.readFileSync(stateFile(), 'utf-8')) as Record<string, unknown>;
}

beforeEach(() => {
  try { realFs.rmSync(stateFile()); } catch { /* no state file yet */ }
});

afterAll(() => { realFs.rmSync(tmpDir, { recursive: true, force: true }); });

// ── MockWindow for trackWindowState ──────────────────────────────────────────

class MockWindow {
  private _listeners = new Map<string, Array<(...a: unknown[]) => void>>();
  _maximized = false;
  _destroyed = false;
  _bounds = { x: 100, y: 150, width: 1200, height: 800 };

  on(event: string, fn: (...a: unknown[]) => void) {
    const list = this._listeners.get(event) ?? [];
    this._listeners.set(event, [...list, fn]);
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    for (const fn of this._listeners.get(event) ?? []) fn(...args);
  }

  isDestroyed() { return this._destroyed; }
  isMaximized() { return this._maximized; }
  getBounds() { return { ...this._bounds }; }
  getNormalBounds() { return { ...this._bounds }; }
}

// ── loadWindowState ───────────────────────────────────────────────────────────

describe('loadWindowState — persistWindowState disabled', () => {
  const cfg: ElectronConfig = { browserWindow: { width: 1400, height: 900 } };

  it('returns config width/height when persistWindowState is absent', () => {
    const state = loadWindowState(cfg);
    expect(state.width).toBe(1400);
    expect(state.height).toBe(900);
    expect(state.isMaximized).toBe(false);
  });

  it('x and y are undefined (centering left to the OS)', () => {
    const state = loadWindowState(cfg);
    expect(state.x).toBeUndefined();
    expect(state.y).toBeUndefined();
  });

  it('uses 1200×800 when browserWindow not specified', () => {
    const state = loadWindowState({});
    expect(state.width).toBe(1200);
    expect(state.height).toBe(800);
  });

  it('ignores existing state file when persistWindowState=false', () => {
    writeState({ x: 50, y: 60, width: 500, height: 400, isMaximized: false });
    const state = loadWindowState(cfg);
    // Config values, not saved values
    expect(state.width).toBe(1400);
    expect(state.height).toBe(900);
  });
});

describe('loadWindowState — persistWindowState enabled', () => {
  const cfg: ElectronConfig = { app: { persistWindowState: true }, browserWindow: { width: 1400, height: 900 } };

  it('returns config defaults when no state file exists', () => {
    const state = loadWindowState(cfg);
    expect(state.width).toBe(1400);
    expect(state.height).toBe(900);
    expect(state.x).toBeUndefined();
    expect(state.y).toBeUndefined();
  });

  it('restores saved width, height, x, y from state file', () => {
    writeState({ x: 200, y: 300, width: 1100, height: 750, isMaximized: false });
    const state = loadWindowState(cfg);
    expect(state.x).toBe(200);
    expect(state.y).toBe(300);
    expect(state.width).toBe(1100);
    expect(state.height).toBe(750);
  });

  it('restores isMaximized=true', () => {
    writeState({ x: 0, y: 0, width: 1200, height: 800, isMaximized: true });
    const state = loadWindowState(cfg);
    expect(state.isMaximized).toBe(true);
  });

  it('clears x/y when saved position is off all screens', () => {
    // Position at x=9999,y=9999 — far off the 1920×1080 mock display
    writeState({ x: 9999, y: 9999, width: 1200, height: 800, isMaximized: false });
    const state = loadWindowState(cfg);
    expect(state.x).toBeUndefined();
    expect(state.y).toBeUndefined();
    // But size is preserved
    expect(state.width).toBe(1200);
    expect(state.height).toBe(800);
  });

  it('keeps x/y when position is on a known display', () => {
    writeState({ x: 500, y: 300, width: 1200, height: 800, isMaximized: false });
    const state = loadWindowState(cfg);
    expect(state.x).toBe(500);
    expect(state.y).toBe(300);
  });

  it('falls back to config width/height when saved values are missing', () => {
    writeState({ x: 0, y: 0, isMaximized: false });
    const state = loadWindowState(cfg);
    expect(state.width).toBe(1400);
    expect(state.height).toBe(900);
  });

  it('returns defaults when state file contains invalid JSON', () => {
    realFs.writeFileSync(stateFile(), 'not-json', 'utf-8');
    const state = loadWindowState(cfg);
    expect(state.width).toBe(1400);
    expect(state.isMaximized).toBe(false);
    expect(state.x).toBeUndefined();
  });

  it('clears x/y when no display is available (empty display list)', () => {
    mockGetAllDisplays.mockReturnValueOnce([]);
    writeState({ x: 100, y: 100, width: 1200, height: 800, isMaximized: false });
    const state = loadWindowState(cfg);
    expect(state.x).toBeUndefined();
    expect(state.y).toBeUndefined();
  });
});

// ── trackWindowState ──────────────────────────────────────────────────────────

describe('trackWindowState', () => {
  it('saves state immediately on close (no debounce)', () => {
    vi.useFakeTimers();
    const win = new MockWindow();
    trackWindowState(win as never);
    win.emit('close');
    expect(realFs.existsSync(stateFile())).toBe(true);
    vi.useRealTimers();
  });

  it('saved state contains correct x, y, width, height', () => {
    const win = new MockWindow();
    win._bounds = { x: 200, y: 300, width: 1100, height: 750 };
    trackWindowState(win as never);
    win.emit('close');
    const saved = readState();
    expect(saved['x']).toBe(200);
    expect(saved['y']).toBe(300);
    expect(saved['width']).toBe(1100);
    expect(saved['height']).toBe(750);
    expect(saved['isMaximized']).toBe(false);
  });

  it('uses getNormalBounds when window is maximized', () => {
    const win = new MockWindow();
    win._maximized = true;
    // getBounds() returns full-screen size — getNormalBounds returns pre-maximize
    win._bounds = { x: 0, y: 0, width: 1920, height: 1080 };
    const normalBounds = { x: 100, y: 100, width: 1200, height: 800 };
    vi.spyOn(win, 'getNormalBounds').mockReturnValue(normalBounds);
    trackWindowState(win as never);
    win.emit('close');
    const saved = readState();
    expect(saved['width']).toBe(1200);
    expect(saved['height']).toBe(800);
    expect(saved['isMaximized']).toBe(true);
  });

  it('debounces: multiple resize events cause only one write after 500ms', () => {
    vi.useFakeTimers();
    const win = new MockWindow();
    trackWindowState(win as never);
    win.emit('resize');
    win.emit('resize');
    win.emit('resize');
    // Not yet written
    expect(realFs.existsSync(stateFile())).toBe(false);
    vi.advanceTimersByTime(500);
    // Written once after debounce
    expect(realFs.existsSync(stateFile())).toBe(true);
    vi.useRealTimers();
  });

  it('close cancels pending debounce timer and saves immediately', () => {
    vi.useFakeTimers();
    const win = new MockWindow();
    trackWindowState(win as never);
    win.emit('resize');  // starts 500ms timer
    win.emit('close');   // should cancel timer and save now
    expect(realFs.existsSync(stateFile())).toBe(true);
    vi.useRealTimers();
  });

  it('does not write when window is destroyed', () => {
    const win = new MockWindow();
    win._destroyed = true;
    trackWindowState(win as never);
    win.emit('close');
    expect(realFs.existsSync(stateFile())).toBe(false);
  });
});
