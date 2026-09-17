import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4179', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true },
  globalSetup: './tests/browser/server-setup.mjs',
});
