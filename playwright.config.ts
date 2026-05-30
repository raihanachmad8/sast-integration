import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-ui',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 6,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Production build runs as NODE_ENV=production, so satisfy the production env guards.
    // 127.0.0.1 passes the non-localhost check; smtp passes the non-console check (mail is mocked in tests).
    env: {
      JWT_SECRET: 'e2e-test-secret-key-minimum-32-characters-long',
      APP_URL: 'http://127.0.0.1:3000',
      MAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'localhost',
    },
  },
});
