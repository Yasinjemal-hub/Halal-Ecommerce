import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node server.js',
      url: 'http://localhost:5000/api/health',
      cwd: '../backend',
      env: { NODE_ENV: 'e2e' },
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'npx react-scripts start',
      url: 'http://localhost:3000',
      cwd: '../frontend',
      env: { BROWSER: 'none', PORT: '3000' },
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
