import { test as base, expect, request as apiRequest, type APIRequestContext } from "@playwright/test";
import { loadRegion, type RegionConfig } from "@quipu/core";
import { ParaBankClient } from "@quipu/api";
import { LoginPage } from "../pages/login.page.js";
import { OverviewPage } from "../pages/overview.page.js";
import { TransferPage } from "../pages/transfer.page.js";

/**
 * `region`       - active RegionConfig, resolved per worker.
 * `loginPage` / `overviewPage` / `transferPage` - page objects bound to the test page.
 * `apiClient`    - separate request context (no shared cookies with the browser).
 * `loggedInPage` - browser already authenticated, pages ready to use.
 */
type WebWorkerFixtures = {
  region: RegionConfig;
};

type WebTestFixtures = {
  loginPage: LoginPage;
  overviewPage: OverviewPage;
  transferPage: TransferPage;
  apiClient: ParaBankClient;
  loggedInPage: { login: LoginPage; overview: OverviewPage; transfer: TransferPage };
};

export const test = base.extend<WebTestFixtures, WebWorkerFixtures>({
  region: [
    async ({}, use) => {
      await use(loadRegion());
    },
    { scope: "worker" },
  ],

  loginPage: async ({ page, region }, use) => {
    await use(new LoginPage(page, region));
  },

  overviewPage: async ({ page, region }, use) => {
    await use(new OverviewPage(page, region));
  },

  transferPage: async ({ page, region }, use) => {
    await use(new TransferPage(page, region));
  },

  apiClient: async ({ region }, use) => {
    // Distinct request context - keeps API setup/verification isolated from
    // the browser's cookie jar so the two layers don't accidentally entangle.
    const ctx: APIRequestContext = await apiRequest.newContext({
      baseURL: region.apiBaseUrl,
      extraHTTPHeaders: { Accept: "application/json" },
      timeout: region.timeouts.apiRequestMs,
    });
    const client = new ParaBankClient(ctx, region);
    await use(client);
    await ctx.dispose();
  },

  loggedInPage: async ({ page, region }, use) => {
    const login = new LoginPage(page, region);
    const overview = new OverviewPage(page, region);
    const transfer = new TransferPage(page, region);
    await login.goto();
    await login.loginAs(
      region.testData.primaryUser.username,
      region.testData.primaryUser.password
    );
    await overview.isVisible();
    await use({ login, overview, transfer });
  },
});

export { expect };
