import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Redirect bare 'electron' import to a lightweight mock so template-electron
      // source files can be imported in a plain Node/Vitest environment.
      electron: resolve(__dirname, 'tests/__mocks__/electron.ts'),
      'electron-updater': resolve(__dirname, 'tests/__mocks__/electron-updater.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
