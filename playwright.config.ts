import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e config. Runs against the real dev stack (`npm run dev`):
 * Angular dev server on :8080 proxying /api to Express on :3001 (see
 * client/proxy.conf.json). Tests exercise the shared Supabase dev database
 * used by the live app - see e2e/README-ish notes in each spec for the
 * constraints that keeps this safe (no destructive resets).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
