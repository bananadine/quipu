import { defineConfig, devices } from "@playwright/test";
import { loadRegion } from "@quipu/core";

// Browser locale and timezone come from the active region config.
const region = loadRegion();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: region.timeouts.navigationMs * 2,
  expect: {
    timeout: region.timeouts.actionMs,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: `playwright-report/${region.id}`, open: "never" }],
    ["junit", { outputFile: `test-results/junit-web-${region.id}.xml` }],
  ],
  use: {
    baseURL: region.webBaseUrl,
    locale: region.locale,
    timezoneId: region.timezoneId,
    actionTimeout: region.timeouts.actionMs,
    navigationTimeout: region.timeouts.navigationMs,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // ParaBank's demo is HTTP-only on some links - be lenient about mixed content.
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Add firefox/webkit projects here when the team is ready for the
    // matrix expansion - each is just another entry, no test changes.
  ],
  outputDir: `test-results/${region.id}`,
});
