import { defineConfig } from "@playwright/test";
import { loadRegion } from "@quipu/core";

// No browsers - APIRequestContext only. Region resolved at load time for report paths.
const region = loadRegion();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: region.timeouts.apiRequestMs * 2,
  expect: {
    timeout: region.timeouts.apiRequestMs,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: `playwright-report/${region.id}`, open: "never" }],
    ["junit", { outputFile: `test-results/junit-api-${region.id}.xml` }],
  ],
  use: {
    baseURL: region.apiBaseUrl,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Accept-Language": region.locale,
    },
    // Trace on first retry - keeps clean runs cheap and gives diagnostics
    // when something flakes.
    trace: "on-first-retry",
  },
  outputDir: `test-results/${region.id}`,
});
