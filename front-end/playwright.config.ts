import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chromium'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
