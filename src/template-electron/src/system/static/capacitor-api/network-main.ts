// Electron implementation of @capacitor/network
import { net } from 'electron';
import { emitPluginEvent, registerPlugin, type AnyRecord, type EventHooks } from '../../shared/functions';

type ConnectionStatus = { connected: boolean; connectionType: 'wifi' | 'cellular' | 'none' | 'unknown' };

let currentStatus: ConnectionStatus | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function probeNetwork(): Promise<ConnectionStatus> {
  if (!net.isOnline()) return { connected: false, connectionType: 'none' };

  // net.isOnline() is Chromium's best local signal. A tiny HEAD request adds a
  // practical reachability check for desktop machines connected to a captive or
  // broken network. It is deliberately short and non-fatal.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch('https://capacitorjs.com/', { method: 'HEAD', signal: controller.signal });
    return { connected: true, connectionType: 'unknown' };
  } catch {
    return { connected: net.isOnline(), connectionType: net.isOnline() ? 'unknown' : 'none' };
  } finally {
    clearTimeout(timer);
  }
}

function sameStatus(a: ConnectionStatus | null, b: ConnectionStatus): boolean {
  return !!a && a.connected === b.connected && a.connectionType === b.connectionType;
}

async function pollAndEmit(force = false): Promise<void> {
  const next = await probeNetwork();
  if (force || !sameStatus(currentStatus, next)) {
    currentStatus = next;
    emitPluginEvent('Network', 'networkStatusChange', next);
  }
}

function startNetworkPolling(): void {
  if (pollTimer) return;
  void pollAndEmit(true);
  pollTimer = setInterval(() => { void pollAndEmit(false); }, 10_000);
}

function stopNetworkPolling(): void {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

class Network {
  async getStatus(): Promise<ConnectionStatus> {
    currentStatus = await probeNetwork();
    return currentStatus;
  }
}

const events: EventHooks = {
  networkStatusChange: { onAdd: startNetworkPolling, onRemove: stopNetworkPolling },
};

registerPlugin('Network', new Network() as unknown as AnyRecord, ['getStatus'], events);
