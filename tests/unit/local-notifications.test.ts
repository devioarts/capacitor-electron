// Tests for local-notifications-main.ts — scheduling, cancel, getPending,
// getDeliveredNotifications, removeDelivered.
// Uses fake timers to verify setTimeout/setInterval scheduling without real delays.
import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

// Use the shared electron alias mock and spy on Notification prototype.
// local-notifications-main.ts imports 'electron' → resolves to the same alias.
import * as ElectronMock from '../../tests/__mocks__/electron.js';

// ── Module import (dynamic because top-level registerPlugin + app.on) ──────────

let LocalNotifications: new () => InstanceType<typeof import('../../src/template-electron/src/system/static/capacitor-api/local-notifications-main.js')['LocalNotifications']>;
let resetNotificationsForTesting: () => void;

beforeAll(async () => {
  const mod = await import('../../src/template-electron/src/system/static/capacitor-api/local-notifications-main.js');
  LocalNotifications = mod.LocalNotifications as never;
  resetNotificationsForTesting = mod.resetNotificationsForTesting;
});

let showSpy: ReturnType<typeof vi.spyOn>;
let isSupportedSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetNotificationsForTesting?.();
  // Spy on the Notification class used by local-notifications-main (via alias)
  showSpy = vi.spyOn(ElectronMock.Notification.prototype, 'show');
  isSupportedSpy = vi.spyOn(ElectronMock.Notification, 'isSupported').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ── checkPermissions / requestPermissions (always granted on Electron) ─────────

describe('permissions', () => {
  it('checkPermissions returns { display: "granted" }', async () => {
    expect(await new LocalNotifications().checkPermissions()).toEqual({ display: 'granted' });
  });

  it('requestPermissions returns { display: "granted" }', async () => {
    expect(await new LocalNotifications().requestPermissions()).toEqual({ display: 'granted' });
  });

  it('areEnabled reflects Notification.isSupported()', async () => {
    isSupportedSpy.mockReturnValue(true);
    expect(await new LocalNotifications().areEnabled()).toEqual({ value: true });
    isSupportedSpy.mockReturnValue(false);
    expect(await new LocalNotifications().areEnabled()).toEqual({ value: false });
  });
});

// ── Android-only stubs ─────────────────────────────────────────────────────────

describe('Android-only stubs', () => {
  it('createChannel resolves without error', async () => {
    await expect(new LocalNotifications().createChannel()).resolves.toBeUndefined();
  });

  it('listChannels returns empty array', async () => {
    expect(await new LocalNotifications().listChannels()).toEqual({ channels: [] });
  });
});

// ── schedule — immediate fire (no schedule) ───────────────────────────────────

describe('schedule — immediate (no schedule object)', () => {
  it('fires notification immediately when no schedule specified', async () => {
    const ln = new LocalNotifications();
    await ln.schedule({ notifications: [{ id: 1, title: 'Hello' }] });
    expect(showSpy).toHaveBeenCalledTimes(1);
  });

  it('returns the notifications in the response', async () => {
    const ln = new LocalNotifications();
    const result = await ln.schedule({ notifications: [{ id: 2, title: 'Test' }] });
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].title).toBe('Test');
  });

  it('does NOT fire when Notification.isSupported() is false', async () => {
    isSupportedSpy.mockReturnValue(false);
    const ln = new LocalNotifications();
    await ln.schedule({ notifications: [{ id: 3, title: 'Silent' }] });
    expect(showSpy).not.toHaveBeenCalled();
  });

  it('adds to delivered list after immediate fire', async () => {
    const ln = new LocalNotifications();
    await ln.schedule({ notifications: [{ id: 4, title: 'A' }] });
    const { notifications } = await ln.getDeliveredNotifications();
    expect(notifications.some((n) => n.id === 4)).toBe(true);
  });
});

// ── schedule — scheduled (setTimeout) ─────────────────────────────────────────

describe('schedule — scheduled via "at" (setTimeout)', () => {
  it('does NOT fire immediately when schedule.at is in the future', async () => {
    vi.useFakeTimers();
    const ln = new LocalNotifications();
    const future = new Date(Date.now() + 5_000);
    await ln.schedule({ notifications: [{ id: 10, title: 'Later', schedule: { at: future } }] });
    expect(showSpy).not.toHaveBeenCalled();
  });

  it('fires after the scheduled delay', async () => {
    vi.useFakeTimers();
    const ln = new LocalNotifications();
    const future = new Date(Date.now() + 2_000);
    await ln.schedule({ notifications: [{ id: 11, title: 'Delayed', schedule: { at: future } }] });
    vi.advanceTimersByTime(2_100);
    expect(showSpy).toHaveBeenCalledTimes(1);
  });

  it('is returned in getPending before firing', async () => {
    vi.useFakeTimers();
    const ln = new LocalNotifications();
    const future = new Date(Date.now() + 60_000);
    await ln.schedule({ notifications: [{ id: 12, title: 'Pending', schedule: { at: future } }] });
    const { notifications } = await ln.getPending();
    expect(notifications.some((n) => n.id === 12)).toBe(true);
  });

  it('removed from getPending after firing', async () => {
    vi.useFakeTimers();
    const ln = new LocalNotifications();
    const future = new Date(Date.now() + 500);
    await ln.schedule({ notifications: [{ id: 13, title: 'Gone', schedule: { at: future } }] });
    vi.advanceTimersByTime(600);
    const { notifications } = await ln.getPending();
    expect(notifications.some((n) => n.id === 13)).toBe(false);
  });
});

// ── schedule — repeating interval ─────────────────────────────────────────────

describe('schedule — repeating every "second"', () => {
  it('fires once per interval tick', async () => {
    vi.useFakeTimers();
    const ln = new LocalNotifications();
    await ln.schedule({
      notifications: [{ id: 20, title: 'Tick', schedule: { every: 'second' } }],
    });
    vi.advanceTimersByTime(3_100);
    expect(showSpy).toHaveBeenCalledTimes(3);
  });

  it('stops after schedule.count firings', async () => {
    vi.useFakeTimers();
    const ln = new LocalNotifications();
    await ln.schedule({
      notifications: [{ id: 21, title: 'Limited', schedule: { every: 'second', count: 2 } }],
    });
    vi.advanceTimersByTime(5_000);
    expect(showSpy).toHaveBeenCalledTimes(2);
  });
});

// ── cancel ─────────────────────────────────────────────────────────────────────

describe('cancel', () => {
  it('cancels a pending notification so it never fires', async () => {
    vi.useFakeTimers();
    const ln = new LocalNotifications();
    const future = new Date(Date.now() + 10_000);
    await ln.schedule({ notifications: [{ id: 30, title: 'Cancelled', schedule: { at: future } }] });
    await ln.cancel({ notifications: [{ id: 30 }] });
    vi.advanceTimersByTime(15_000);
    expect(showSpy).not.toHaveBeenCalled();
  });

  it('removes the notification from getPending', async () => {
    vi.useFakeTimers();
    const ln = new LocalNotifications();
    const future = new Date(Date.now() + 10_000);
    await ln.schedule({ notifications: [{ id: 31, title: 'Remove', schedule: { at: future } }] });
    await ln.cancel({ notifications: [{ id: 31 }] });
    const { notifications } = await ln.getPending();
    expect(notifications.some((n) => n.id === 31)).toBe(false);
  });

  it('is idempotent (cancelling unknown id does not throw)', async () => {
    const ln = new LocalNotifications();
    await expect(ln.cancel({ notifications: [{ id: 9999 }] })).resolves.toBeUndefined();
  });
});

// ── getDeliveredNotifications / removeDelivered ────────────────────────────────

describe('getDeliveredNotifications + removeDeliveredNotifications', () => {
  it('delivered list grows after immediate schedule', async () => {
    const ln = new LocalNotifications();
    await ln.schedule({ notifications: [{ id: 40, title: 'A' }, { id: 41, title: 'B' }] });
    const { notifications } = await ln.getDeliveredNotifications();
    expect(notifications.length).toBeGreaterThanOrEqual(2);
  });

  it('removeDeliveredNotifications removes only the specified ids', async () => {
    const ln = new LocalNotifications();
    await ln.schedule({ notifications: [{ id: 50, title: 'Keep' }, { id: 51, title: 'Remove' }] });
    await ln.removeDeliveredNotifications({ notifications: [{ id: 51 }] });
    const { notifications } = await ln.getDeliveredNotifications();
    expect(notifications.some((n) => n.id === 50)).toBe(true);
    expect(notifications.some((n) => n.id === 51)).toBe(false);
  });

  it('removeAllDeliveredNotifications clears the list', async () => {
    const ln = new LocalNotifications();
    await ln.schedule({ notifications: [{ id: 60, title: 'One' }, { id: 61, title: 'Two' }] });
    await ln.removeAllDeliveredNotifications();
    const { notifications } = await ln.getDeliveredNotifications();
    expect(notifications).toHaveLength(0);
  });
});
