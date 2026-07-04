// Electron implementation of @capacitor/local-notifications using native Notification objects.
import { Notification, BrowserWindow, app } from 'electron';
import { emitPluginEvent, registerPlugin, type AnyRecord } from '../../shared/functions';

// ── Types ────────────────────────────────────────────────────────────────────

interface NotifSchema {
  id: number;
  title: string;
  body?: string;
  silent?: boolean;
  schedule?: {
    at?: Date | string;
    every?: 'year' | 'month' | 'two-weeks' | 'week' | 'day' | 'hour' | 'minute' | 'second';
    count?: number;
    repeats?: boolean;
  };
  extra?: unknown;
  actionTypeId?: string;
}

type TimerHandle = { cancel: () => void };

// ── State ────────────────────────────────────────────────────────────────────

const timers    = new Map<number, TimerHandle>();
const pending   = new Map<number, NotifSchema>();
const delivered: NotifSchema[] = [];
const MAX_DELIVERED = 200;
const MAX_TIMER_DELAY_MS = 2_147_483_647;

const EVERY_MS: Record<string, number> = {
  second:       1_000,
  minute:      60_000,
  hour:     3_600_000,
  day:     86_400_000,
  week:   604_800_000,
  'two-weeks': 1_209_600_000,
  month:  2_592_000_000,
  year:  31_536_000_000,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function focusMainWindow(): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function fire(n: NotifSchema): void {
  if (!Notification.isSupported()) return;
  const notif = new Notification({ title: n.title, body: n.body ?? '', silent: n.silent ?? false });
  notif.on('show', () => {
    delivered.push(n);
    if (delivered.length > MAX_DELIVERED) delivered.splice(0, delivered.length - MAX_DELIVERED);
    emitPluginEvent('LocalNotifications', 'localNotificationReceived', n);
  });
  notif.on('failed', (_e, err) => {
    // On macOS (Electron 42+) unsigned apps cannot show notifications via UNNotification.
    console.warn('[LocalNotifications] show failed:', err);
  });
  notif.on('click', () => {
    focusMainWindow();
    emitPluginEvent('LocalNotifications', 'localNotificationActionPerformed', {
      notification: n,
      actionId: 'tap',
      inputValue: undefined,
    });
  });
  notif.show();
}

function cancelById(id: number): void {
  const h = timers.get(id);
  if (!h) return;
  h.cancel();
  timers.delete(id);
  pending.delete(id);
}

function scheduleLongTimeout(cb: () => void, delayMs: number): { cancel: () => void } {
  const safeDelay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
  const targetTime = Date.now() + safeDelay;
  let ref: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const arm = (): void => {
    if (cancelled) return;
    const remaining = targetTime - Date.now();
    const delay = remaining <= 0 ? 0 : Math.min(remaining, MAX_TIMER_DELAY_MS);
    ref = setTimeout(() => {
      if (cancelled) return;
      if (Date.now() >= targetTime) cb();
      else arm();
    }, delay);
  };

  arm();
  return {
    cancel: () => {
      cancelled = true;
      if (ref) clearTimeout(ref);
    },
  };
}

// ── Plugin class ─────────────────────────────────────────────────────────────

/**
 * Electron implementation of the Capacitor LocalNotifications plugin.
 *
 * Scheduling is handled entirely in-process via cancellable `setTimeout` chains.
 * All state (pending timers, delivered list) is in-memory and resets on restart.
 *
 * Limitations:
 * - `schedule.on` (calendar-style scheduling) is not supported — Electron has no
 *   OS-level notification scheduler.
 * - Custom notification sounds and action buttons are not supported.
 * - `schedule.every: 'month'` and `'year'` use fixed millisecond approximations
 *   (30 days and 365 days respectively) rather than calendar-aware intervals.
 * - Android-only methods (`createChannel`, `deleteChannel`, `listChannels`) are
 *   stubbed as no-ops.
 */
export function resetNotificationsForTesting(): void {
  for (const id of [...timers.keys()]) cancelById(id);
  pending.clear();
  delivered.splice(0);
}

export class LocalNotifications {

  async schedule(opts: Record<string, unknown>): Promise<{ notifications: NotifSchema[] }> {
    const notifications = (opts['notifications'] as NotifSchema[] | undefined) ?? [];
    for (const n of notifications) {
      cancelById(n.id);
      const sched = n.schedule;
      if (!sched || (!sched.at && !sched.every)) {
        fire(n);
        continue;
      }
      if (sched.at) {
        const ts = sched.at instanceof Date ? sched.at.getTime() : new Date(sched.at as string).getTime();
        const delay = Math.max(0, ts - Date.now());
        const handle = scheduleLongTimeout(() => { fire(n); timers.delete(n.id); pending.delete(n.id); }, delay);
        timers.set(n.id, handle);
        pending.set(n.id, n);
        continue;
      }
      if (sched.every) {
        const ms = EVERY_MS[sched.every] ?? 60_000;
        const max = sched.count ?? Infinity;
        let fired = 0;
        const finish = (): void => {
          timers.delete(n.id);
          pending.delete(n.id);
        };
        const tick = (): boolean => {
          fire(n);
          fired++;
          return fired >= max || sched.repeats === false;
        };
        if (sched.repeats === false) {
          const handle = scheduleLongTimeout(() => {
            tick();
            finish();
          }, ms);
          timers.set(n.id, handle);
        } else {
          const scheduleNext = (): void => {
            const handle = scheduleLongTimeout(() => {
              if (tick()) finish();
              else scheduleNext();
            }, ms);
            timers.set(n.id, handle);
          };
          scheduleNext();
        }
        pending.set(n.id, n);
      }
    }
    return { notifications };
  }

  async cancel(opts: Record<string, unknown>): Promise<void> {
    for (const { id } of (opts['notifications'] as { id: number }[] | undefined) ?? []) {
      cancelById(id);
    }
  }

  async getPending(): Promise<{ notifications: NotifSchema[] }> {
    return { notifications: [...pending.values()] };
  }

  async getDeliveredNotifications(): Promise<{ notifications: NotifSchema[] }> {
    return { notifications: [...delivered] };
  }

  async removeDeliveredNotifications(opts: Record<string, unknown>): Promise<void> {
    const ids = new Set(((opts['notifications'] as { id: number }[] | undefined) ?? []).map((n) => n.id));
    delivered.splice(0, delivered.length, ...delivered.filter((n) => !ids.has(n.id)));
  }

  async removeAllDeliveredNotifications(): Promise<void> {
    delivered.splice(0);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async registerActionTypes(_opts: Record<string, unknown>): Promise<void> {}

  async checkPermissions(): Promise<{ display: string }> {
    return { display: 'granted' };
  }

  async requestPermissions(): Promise<{ display: string }> {
    return { display: 'granted' };
  }

  async checkExactNotificationSetting(): Promise<{ exact_alarm: string }> {
    return { exact_alarm: 'granted' };
  }

  async changeExactNotificationSetting(): Promise<{ exact_alarm: string }> {
    return { exact_alarm: 'granted' };
  }

  async areEnabled(): Promise<{ value: boolean }> {
    return { value: Notification.isSupported() };
  }

  // Android-only stubs — no-op on Electron
  async createChannel(): Promise<void> {}
  async deleteChannel(): Promise<void> {}
  async listChannels(): Promise<{ channels: [] }> { return { channels: [] }; }
}

// ── Registration ─────────────────────────────────────────────────────────────

app.on('will-quit', () => {
  for (const id of [...timers.keys()]) cancelById(id);
});

registerPlugin(
  'LocalNotifications',
  new LocalNotifications() as unknown as AnyRecord,
  [
    'schedule',
    'cancel',
    'getPending',
    'getDeliveredNotifications',
    'removeDeliveredNotifications',
    'removeAllDeliveredNotifications',
    'registerActionTypes',
    'checkPermissions',
    'requestPermissions',
    'checkExactNotificationSetting',
    'changeExactNotificationSetting',
    'areEnabled',
    'createChannel',
    'deleteChannel',
    'listChannels',
  ],
);
