import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  // Each test file gets its own Electron process.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Screenshot on failure for easier debugging.
    screenshot: 'only-on-failure',
  },
});
