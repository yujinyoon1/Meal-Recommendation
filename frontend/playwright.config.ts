import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config.
 * 가정:
 *  - backend dev 서버가 :9534 에서 LLM_PROVIDER=mock 으로 기동 중
 *  - frontend dev 서버가 :9514 에서 기동 중 (또는 webServer로 자동 기동)
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:9514',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:9514',
    timeout: 60_000,
    reuseExistingServer: true,
  },
});
