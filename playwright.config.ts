import { defineConfig, devices } from '@playwright/test';
import { parseEnvTest } from './tests/utils/parseEnvTest';

// Parse .env.test once at config load time.
// This throws with a clear message if .env.test is missing or malformed.
const envConfig = parseEnvTest();

export default defineConfig({
  testDir: './tests/e2e',

  globalSetup: './tests/global-setup.ts',

  /* Maximum time one test can run */
  timeout: 60_000,

  /* Default timeout for all expect() assertions */
  expect: { timeout: 10_000 },

  /* Retry once on CI, never locally */
  retries: process.env.CI ? 1 : 0,

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Run one test at a time so they execute in order and are easy to follow visually */
  workers: 2,

  /* Reporter: list in the terminal, full HTML report saved to tests/playwright-report */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/playwright-report', open: 'never' }],
    ['junit', { outputFile: 'tests/logs/results.xml' }],
  ],

  use: {
    /* Base URL read from .env.test [config] section */
    baseURL: envConfig.baseUrl,

    /* Show the browser so the user can watch tests run */
    headless: false,

    /* Slow down every interaction by 200 ms for visibility */
    launchOptions: { slowMo: 200 },

    /* Capture a screenshot on failure */
    screenshot: 'only-on-failure',

    /* Keep video recording only when a test fails */
    video: 'retain-on-failure',
  },

  /* Only Chromium — no Firefox or WebKit */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /*
   * Auth session state files live under tests/.auth/.
   * One JSON file per logical user role, created by the global auth setup
   * in Phase 3. They are listed here so tests can reference them via
   *   test.use({ storageState: 'tests/.auth/member.json' })
   *
   * The files do not need to exist until the Phase 3 auth setup runs.
   */
  // Auth file paths referenced by tests (Phase 3 populates these):
  //   tests/.auth/superAdmin.json
  //   tests/.auth/groupAdminUllas.json
  //   tests/.auth/groupAdminVasu.json
  //   tests/.auth/memberRaghu.json
  //   tests/.auth/unauthenticated.json   (empty / no storage state)
});
