import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  // @real spricht mit dem echten Supabase-Projekt, nur über npm run test:live.
  grepInvert: process.env.LIVE_REAL ? undefined : /@real/,
  use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
});
