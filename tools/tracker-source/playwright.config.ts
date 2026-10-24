import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  timeout: 45000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', headless: true },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --mode audit-ui',
    url: 'http://127.0.0.1:5173/tests/browser/harness.html',
    reuseExistingServer: false,
  },
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-results.json' }]],
});
