import { defineConfig, devices } from '@playwright/test';
const webPort=Number(process.env.AGAP_E2E_WEB_PORT??5174);
const apiPort=Number(process.env.AGAP_E2E_API_PORT??4101);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://127.0.0.1:${webPort}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } }],
  webServer: [
    {command:'npx tsx --tsconfig tsconfig.platform.json apps/api/test/browser-server.ts',url:`http://127.0.0.1:${apiPort}/api/v1/health`,reuseExistingServer:false,timeout:30000},
    {command:`npm run dev -- --port ${webPort} --strictPort`,url:`http://127.0.0.1:${webPort}`,reuseExistingServer:false,env:{AGAP_API_TARGET:`http://127.0.0.1:${apiPort}`}},
  ],
});
