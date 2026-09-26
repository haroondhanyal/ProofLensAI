import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig, cucumberReporter } from 'playwright-bdd';
import { loadQaEnv } from './e2e/support/load-qa-env';

loadQaEnv();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
const webServerPort = new URL(baseURL).port || '3001';
const bddTestDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts',
  outputDir: '.bdd-generated',
  quotes: 'double',
});

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: Number(process.env.PW_WORKERS ?? 2),
  timeout: 45_000,
  expect: { timeout: 8_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['html', { outputFolder: 'reports/playwright-html', open: 'never' }],
    ['allure-playwright', {
      resultsDir: 'reports/allure-results',
      detail: true,
      suiteTitle: true,
      environmentInfo: {
        environment: process.env.TEST_ENV ?? 'qa',
        baseUrl: baseURL,
        apiUrl: process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1',
        browser: 'Chromium',
      },
    }],
    cucumberReporter('html', { outputFile: 'reports/cucumber-report.html', externalAttachments: true }),
  ],
  outputDir: 'reports/test-artifacts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'chromium', testDir: './e2e', testIgnore: ['**/.features-gen/**', '**/.bdd-generated/**'], use: { ...devices['Desktop Chrome'] } },
    { name: 'bdd', testDir: bddTestDir, use: { ...devices['Desktop Chrome'], screenshot: 'on', video: 'on' } },
  ],
  webServer: {
    command: `npm run dev --workspace=prooflens-web -- --port ${webServerPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
