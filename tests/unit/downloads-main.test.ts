// Tests for downloads-main.ts — renderer event names for completed downloads.
// The public bridge logs final download outcomes as event types, so docs,
// playground, and runtime must agree on these names.
import { vi, describe, it, expect } from 'vitest';

vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: () => null },
  ipcMain: { handle: () => {}, on: () => {} },
}));

import { downloadDoneEventType } from '../../src/template-electron/src/system/static/electron-api/downloads-main.js';

describe('downloadDoneEventType', () => {
  it.each(['completed', 'cancelled', 'interrupted'] as const)('keeps Electron final state "%s" as the renderer event type', (state) => {
    expect(downloadDoneEventType(state)).toBe(state);
  });

  it('falls back to done for an unexpected Electron state', () => {
    expect(downloadDoneEventType('mystery-state')).toBe('done');
  });
});
