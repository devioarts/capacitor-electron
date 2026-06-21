// Tests for IPC trust mechanism in functions.ts (H-1 fix)
// These are the critical security functions that gate all system IPC handlers.
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { IpcMainInvokeEvent, IpcMainEvent } from 'electron';
import {
  setIpcSenderCheck,
  isIpcSenderTrusted,
  assertTrustedIpcSender,
  setMainWindow,
  getMainWindow,
  onMainWindowChanged,
} from '../../src/template-electron/src/system/shared/functions.js';

// Helper to create a minimal mock IPC event with a given sender URL.
function makeEvent(url: string): IpcMainInvokeEvent {
  return { senderFrame: { url } } as unknown as IpcMainInvokeEvent;
}

// Reset sender check to "allow all" between tests.
beforeEach(() => {
  setIpcSenderCheck(() => true);
  setMainWindow(null);
});

// ── isIpcSenderTrusted ────────────────────────────────────────────────────────

describe('isIpcSenderTrusted', () => {
  it('trusts all senders when check is set to allow-all', () => {
    setIpcSenderCheck(() => true);
    expect(isIpcSenderTrusted(makeEvent('http://evil.com'))).toBe(true);
    expect(isIpcSenderTrusted(makeEvent(''))).toBe(true);
  });

  it('rejects all senders when check is set to deny-all', () => {
    setIpcSenderCheck(() => false);
    expect(isIpcSenderTrusted(makeEvent('file:///app/index.html'))).toBe(false);
  });

  it('allows only the expected origin', () => {
    setIpcSenderCheck((url) => url.startsWith('file:///trusted/'));
    expect(isIpcSenderTrusted(makeEvent('file:///trusted/index.html'))).toBe(true);
    expect(isIpcSenderTrusted(makeEvent('file:///other/index.html'))).toBe(false);
    expect(isIpcSenderTrusted(makeEvent('http://evil.com'))).toBe(false);
  });

  it('passes the sender frame URL (not the window URL) to the check function', () => {
    const seen: string[] = [];
    setIpcSenderCheck((url) => { seen.push(url); return true; });
    isIpcSenderTrusted(makeEvent('http://frame.example.com'));
    expect(seen).toEqual(['http://frame.example.com']);
  });

  it('returns true when senderFrame is absent (no frame info)', () => {
    setIpcSenderCheck((url) => url === '');
    const eventNoFrame = {} as unknown as IpcMainInvokeEvent;
    expect(isIpcSenderTrusted(eventNoFrame)).toBe(true);
  });

  it('works with IpcMainEvent (ipcMain.on events)', () => {
    setIpcSenderCheck((url) => url === 'file:///app/index.html');
    const onEvent = { senderFrame: { url: 'file:///app/index.html' } } as unknown as IpcMainEvent;
    expect(isIpcSenderTrusted(onEvent)).toBe(true);
  });
});

// ── assertTrustedIpcSender ────────────────────────────────────────────────────

describe('assertTrustedIpcSender', () => {
  it('does not throw for a trusted sender', () => {
    setIpcSenderCheck(() => true);
    expect(() => assertTrustedIpcSender(makeEvent('file:///app/index.html'), 'test:channel')).not.toThrow();
  });

  it('throws for an untrusted sender', () => {
    setIpcSenderCheck(() => false);
    expect(() => assertTrustedIpcSender(makeEvent('http://evil.com'), 'test:channel')).toThrow();
  });

  it('thrown error has code FORBIDDEN', () => {
    setIpcSenderCheck(() => false);
    try {
      assertTrustedIpcSender(makeEvent('http://evil.com'), 'secure:channel');
    } catch (err) {
      expect((err as Error & { code?: string }).code).toBe('FORBIDDEN');
      return;
    }
    expect.fail('should have thrown');
  });

  it('error message includes the channel name', () => {
    setIpcSenderCheck(() => false);
    try {
      assertTrustedIpcSender(makeEvent('http://evil.com'), 'dialogs:showOpenDialog');
    } catch (err) {
      expect((err as Error).message).toContain('dialogs:showOpenDialog');
      return;
    }
    expect.fail('should have thrown');
  });
});

// ── setMainWindow / getMainWindow ─────────────────────────────────────────────

describe('setMainWindow / getMainWindow', () => {
  it('returns null before any window is set', () => {
    expect(getMainWindow()).toBeNull();
  });

  it('returns the window after setMainWindow', () => {
    const win = { isDestroyed: () => false } as unknown as import('electron').BrowserWindow;
    setMainWindow(win);
    expect(getMainWindow()).toBe(win);
  });

  it('returns null when the window is destroyed', () => {
    const win = { isDestroyed: () => true } as unknown as import('electron').BrowserWindow;
    setMainWindow(win);
    expect(getMainWindow()).toBeNull();
  });

  it('returns null after setMainWindow(null)', () => {
    const win = { isDestroyed: () => false } as unknown as import('electron').BrowserWindow;
    setMainWindow(win);
    setMainWindow(null);
    expect(getMainWindow()).toBeNull();
  });
});

// ── onMainWindowChanged ───────────────────────────────────────────────────────

describe('onMainWindowChanged', () => {
  it('fires the listener when a new window is set', () => {
    const calls: Array<import('electron').BrowserWindow | null> = [];
    onMainWindowChanged((w) => calls.push(w));

    const win = { isDestroyed: () => false } as unknown as import('electron').BrowserWindow;
    setMainWindow(win);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(win);
  });

  it('fires with null when window is cleared', () => {
    const win = { isDestroyed: () => false } as unknown as import('electron').BrowserWindow;
    setMainWindow(win);

    const calls: Array<import('electron').BrowserWindow | null> = [];
    onMainWindowChanged((w) => calls.push(w));
    setMainWindow(null);
    expect(calls[0]).toBeNull();
  });

  it('unsubscribe stops future calls', () => {
    const calls: unknown[] = [];
    const unsub = onMainWindowChanged((w) => calls.push(w));

    const win = { isDestroyed: () => false } as unknown as import('electron').BrowserWindow;
    setMainWindow(win);
    expect(calls).toHaveLength(1);

    unsub();
    setMainWindow(null);
    expect(calls).toHaveLength(1); // no new call after unsubscribe
  });

  it('multiple listeners all fire', () => {
    const a: unknown[] = [];
    const b: unknown[] = [];
    onMainWindowChanged((w) => a.push(w));
    onMainWindowChanged((w) => b.push(w));

    const win = { isDestroyed: () => false } as unknown as import('electron').BrowserWindow;
    setMainWindow(win);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });
});
