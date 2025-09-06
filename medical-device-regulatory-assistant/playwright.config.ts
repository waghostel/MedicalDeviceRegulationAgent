import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
    /* Visual comparison settings */
    ignoreHTTPSErrors: true,
    /* Reduce flakiness in visual tests */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  /* Global test timeout */
  timeout: 30000,
  
  /* Expect timeout for assertions */
  expect: {
    /* Visual comparison threshold */
    threshold: 0.2,
    /* Animation handling */
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'css',
      animations: 'disabled',
    },
    toMatchSnapshot: {
      threshold: 0.2,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers for cross-browser testing
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile viewports for responsive testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
        hasTouch: true,
      },
    },

    // Tablet viewports
    {
      name: 'tablet-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet-safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },

    // High DPI displays
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2,
      },
    },

    // Visual regression specific projects
    {
      name: 'visual-chromium',
      testDir: './e2e/visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Disable animations for consistent screenshots
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'visual-firefox',
      testDir: './e2e/visual',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'visual-webkit',
      testDir: './e2e/visual',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
        reducedMotion: 'reduce',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'cd backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8000',
      port: 8000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});