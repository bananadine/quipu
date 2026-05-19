import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { loadRegion, type RegionConfig } from "@quipu/core";
import { ParaBankClient } from "../clients/parabank.client.js";

/**
 * `region`       - active RegionConfig (URLs, test data, timeouts), resolved per worker.
 * `apiClient`    - unauthenticated client, for error-path tests.
 * `authedClient` - primary user already logged in, for happy-path tests.
 */
type ApiWorkerFixtures = {
  region: RegionConfig;
};

type ApiTestFixtures = {
  apiClient: ParaBankClient;
  authedClient: ParaBankClient;
};

export const test = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  region: [
    async ({}, use) => {
      await use(loadRegion());
    },
    { scope: "worker" },
  ],

  apiClient: async ({ request, region }, use) => {
    const client = new ParaBankClient(request, region);
    await use(client);
  },

  authedClient: async ({ request, region }, use) => {
    const client = new ParaBankClient(request, region);
    const { username, password } = region.testData.primaryUser;
    const res = await client.login(username, password);
    // ParaBank returns 302 on success, 200 (with form re-rendered) on failure.
    if (res.status() >= 400) {
      throw new Error(
        "Authed fixture failed to log in user '" + username + "' against region '" +
          region.id + "' - HTTP " + res.status() + ". Check region.testData.primaryUser."
      );
    }
    await use(client);
  },
});

export { expect };
export type { APIRequestContext };
