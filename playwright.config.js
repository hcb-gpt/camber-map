import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --port 4173 --strictPort --host 127.0.0.1',
    port: 4173,
    reuseExistingServer: !Boolean(process.env.CI),
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
