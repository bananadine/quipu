import type { RegionConfig } from "../schema.js";

/**
 * United States region.
 *
 * Uses the live ParaBank demo as the backing deployment. In a real multi-region
 * setup, each region's `webBaseUrl` and `apiBaseUrl` would point at a separate
 * cluster; the framework treats them as interchangeable so long as they
 * satisfy the same contract.
 */
export const us: RegionConfig = {
  id: "us",
  displayName: "United States",

  webBaseUrl: "https://parabank.parasoft.com/parabank",
  apiBaseUrl: "https://parabank.parasoft.com/parabank/services_proxy/bank",

  currency: "USD",
  locale: "en-US",
  timezoneId: "America/New_York",

  testData: {
    primaryUser: {
      username: "john",
      password: "demo",
      customerId: 12212,
    },
    invalidUser: {
      username: "nobody",
      password: "wrongpass-us",
    },
    defaultTransferAmount: 25.0,
  },

  features: {
    strictPasswordPolicy: false,
    billPayEnabled: true,
  },

  timeouts: {
    actionMs: 10_000,
    navigationMs: 30_000,
    apiRequestMs: 15_000,
  },
};
