import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Rambler.Web.Next end-to-end tests.
 *
 * The app is expected to already be running (Docker) at http://localhost:5001,
 * so no `webServer` is configured here. Override the target with E2E_BASE_URL.
 */
export default defineConfig({
  testDir: "./e2e",
  // Fail the build on CI if test.only was left in the source.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  // Per-test timeout.
  timeout: 30_000,
  expect: {
    // Timeout for individual expect() assertions.
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5001",
    trace: "on-first-retry",
    // Timeout for navigations and actions.
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
