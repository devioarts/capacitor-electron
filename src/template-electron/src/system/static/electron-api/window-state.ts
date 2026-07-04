// Window bounds/maximized-state persistence helpers for the main BrowserWindow.
import { app, BrowserWindow, screen } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { ElectronConfig } from '../../shared/types';

interface SavedState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

type RawState = Partial<Record<keyof SavedState, unknown>>;

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const MAX_WINDOW_SIZE = 100_000;
const MIN_VISIBLE_SIZE = 64;

function statePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function readState(): RawState | null {
  try {
    const state = JSON.parse(fs.readFileSync(statePath(), 'utf-8')) as unknown;
    return state && typeof state === 'object' && !Array.isArray(state) ? state as RawState : null;
  } catch {
    return null;
  }
}

function writeState(state: SavedState): void {
  try {
    fs.writeFileSync(statePath(), JSON.stringify(state), 'utf-8');
  } catch {
    // non-fatal — userData may not always be writable
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function validDimension(value: unknown): number | undefined {
  const n = finiteNumber(value);
  return n !== undefined && n > 0 && n <= MAX_WINDOW_SIZE ? n : undefined;
}

function isVisibleOnAnyScreen(x: number, y: number, width: number, height: number): boolean {
  return screen.getAllDisplays().some(({ bounds: b }) => {
    const visibleWidth = Math.min(x + width, b.x + b.width) - Math.max(x, b.x);
    const visibleHeight = Math.min(y + height, b.y + b.height) - Math.max(y, b.y);
    return visibleWidth >= Math.min(width, MIN_VISIBLE_SIZE)
      && visibleHeight >= Math.min(height, MIN_VISIBLE_SIZE);
  });
}

/**
 * Load saved window bounds. Call before new BrowserWindow().
 * Returns config defaults when app.persistWindowState is disabled or no state is saved.
 */
export function loadWindowState(cfg: ElectronConfig): WindowBounds {
  const browserWindow = cfg.browserWindow ?? {};

  const defaults: WindowBounds = {
    width: browserWindow.width ?? 1200,
    height: browserWindow.height ?? 800,
    isMaximized: false,
  };

  if (!cfg.app?.persistWindowState) return defaults;

  const saved = readState();
  if (!saved) return defaults;

  const width = validDimension(saved.width) ?? defaults.width;
  const height = validDimension(saved.height) ?? defaults.height;
  let x: number | undefined = finiteNumber(saved.x);
  let y: number | undefined = finiteNumber(saved.y);
  // Drop saved position if invalid, off-screen, or only a tiny sliver is visible.
  if (x === undefined || y === undefined || !isVisibleOnAnyScreen(x, y, width, height)) { x = undefined; y = undefined; }

  return {
    x,
    y,
    width,
    height,
    isMaximized: saved.isMaximized === true,
  };
}

/**
 * Attach resize/move/close listeners that debounce-persist window state.
 * Call after new BrowserWindow() when app.persistWindowState is enabled.
 */
export function trackWindowState(win: BrowserWindow): void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function save(): void {
    if (win.isDestroyed()) return;
    const isMaximized = win.isMaximized();
    // getNormalBounds() returns pre-maximize dimensions — avoids saving screen-sized bounds
    const { x, y, width, height } = isMaximized ? win.getNormalBounds() : win.getBounds();
    writeState({ x, y, width, height, isMaximized });
  }

  function schedule(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 500);
  }

  win.on('resize', schedule);
  win.on('move',   schedule);
  win.on('close', () => {
    if (timer) clearTimeout(timer);
    save();
  });
}
