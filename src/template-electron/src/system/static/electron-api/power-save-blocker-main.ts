import { ipcMain, powerSaveBlocker } from 'electron';
import type { PowerSaveBlockerType } from '../../shared/types';

const blockerTypes = new Set<PowerSaveBlockerType>([
  'prevent-app-suspension',
  'prevent-display-sleep',
]);

function assertBlockerType(type: unknown): asserts type is PowerSaveBlockerType {
  if (!blockerTypes.has(type as PowerSaveBlockerType)) {
    throw new Error(`Invalid powerSaveBlocker type: ${String(type)}`);
  }
}

function assertBlockerId(id: unknown): asserts id is number {
  if (!Number.isInteger(id) || (id as number) < 0) {
    throw new Error(`Invalid powerSaveBlocker id: ${String(id)}`);
  }
}

ipcMain.handle('powerSaveBlocker:start', (_, type: PowerSaveBlockerType) => {
  assertBlockerType(type);
  return powerSaveBlocker.start(type);
});

ipcMain.handle('powerSaveBlocker:stop', (_, id: number) => {
  assertBlockerId(id);
  return powerSaveBlocker.stop(id);
});

ipcMain.handle('powerSaveBlocker:isStarted', (_, id: number) => {
  assertBlockerId(id);
  return powerSaveBlocker.isStarted(id);
});
