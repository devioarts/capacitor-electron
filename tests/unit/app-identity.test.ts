import { describe, expect, it } from 'vitest';
import * as path from 'path';
import {
  resolveAppVersion,
  resolveUserDataName,
  resolveUserDataPath,
} from '../../src/template-electron/src/system/shared/app-identity.js';

describe('app identity helpers', () => {
  it('uses desktopName before the display product name for userData', () => {
    expect(
      resolveUserDataName({
        desktopName: 'tofik',
        name: 'ignored',
        productName: 'Tofík',
      }),
    ).toBe('tofik');
  });

  it('normalizes package names into safe userData directory names', () => {
    expect(resolveUserDataName({ name: 'Tofík' })).toBe('tofik');
    expect(resolveUserDataName({ name: '@Example/Tofík App' })).toBe('example-tofik-app');
  });

  it('prefers a safe display name over generic app package metadata', () => {
    expect(
      resolveUserDataName({
        name: 'app',
        desktopName: 'app',
        productName: 'Tofík',
      }),
    ).toBe('tofik');
  });

  it('resolves a userData path from appData and package metadata', () => {
    expect(resolveUserDataPath('/Users/dev/AppData/Roaming', { desktopName: 'tofik' })).toBe(
      path.join('/Users/dev/AppData/Roaming', 'tofik'),
    );
  });

  it('falls back to a safe display name when package metadata is missing', () => {
    expect(resolveUserDataName(null, 'Tofík')).toBe('tofik');
  });

  it('ignores unreplaced template placeholders', () => {
    expect(resolveUserDataName({ desktopName: '__APP_NAME__' })).toBeNull();
    expect(resolveAppVersion({ version: '__APP_VERSION__' })).toBeNull();
  });

  it('resolves app version from package metadata', () => {
    expect(resolveAppVersion({ version: '1.2.3' })).toBe('1.2.3');
  });
});
