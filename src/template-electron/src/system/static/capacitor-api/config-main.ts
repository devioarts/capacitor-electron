// Main-process provider for renderer-side switches that choose native vs web Capacitor implementations.
import { app } from 'electron';
import { createCapacitorFileProtocolRoots, createCapacitorFileSrcMappings, resolveAppProtocolConfig } from '../electron-api/app-protocol-main';
import { loadConfig, trustedIpcOn } from '../../shared/functions';

type BuiltinCapacitorConfig = {
  preferences: boolean;
};

type CapacitorFileSrcConfig = {
  enabled: boolean;
  roots: {
    name: string;
    fileUrlPrefix: string;
    urlPrefix: string;
  }[];
};

function getBuiltinCapacitorConfig(): BuiltinCapacitorConfig {
  const { cfg } = loadConfig();

  return {
    preferences: cfg.capacitorPlugins?.preferences !== false,
  };
}

function getCapacitorFileSrcConfig(): CapacitorFileSrcConfig {
  const { cfg } = loadConfig();
  const appConfig = cfg.app ?? {};

  if (!app.isPackaged || appConfig.serveMode !== 'protocol') {
    return { enabled: false, roots: [] };
  }

  const protocolConfig = resolveAppProtocolConfig(appConfig.protocol);
  return {
    enabled: true,
    roots: createCapacitorFileSrcMappings(protocolConfig, createCapacitorFileProtocolRoots()),
  };
}

trustedIpcOn('CapElectron-getBuiltinCapacitorConfig', (event) => {
  event.returnValue = getBuiltinCapacitorConfig();
});

trustedIpcOn('CapElectron-getCapacitorFileSrcConfig', (event) => {
  event.returnValue = getCapacitorFileSrcConfig();
});
