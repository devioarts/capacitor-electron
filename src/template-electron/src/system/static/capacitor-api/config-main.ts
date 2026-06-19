import { ipcMain } from 'electron';
import { loadConfig } from '../../shared/functions';

type BuiltinCapacitorConfig = {
  preferences: boolean;
};

function getBuiltinCapacitorConfig(): BuiltinCapacitorConfig {
  const { cfg } = loadConfig();

  return {
    preferences: cfg.capacitorPlugins?.preferences !== false,
  };
}

ipcMain.on('CapElectron-getBuiltinCapacitorConfig', (event) => {
  event.returnValue = getBuiltinCapacitorConfig();
});
