import type { RegionConfig } from "../schema.js";

/**
 * United Kingdom region.
 *
 * GBP currency, en-GB locale, bill pay disabled to exercise feature-flag-aware
 * test skipping.
 */
export const uk: RegionConfig = {
  id: "uk",
  displayName: "United Kingdom",

  webBaseUrl: "https://parabank.parasoft.com/parabank",
  apiBaseUrl: "https://parabank.parasoft.com/parabank/services_proxy/bank",

  currency: "GBP",
  locale: "en-GB",
  timezoneId: "Europe/London",

  testData: {
    primaryUser: {
      username: "john",
      password: "demo",
      customerId: 12212,
    },
    invalidUser: {
      username: "nobody",
      password: "wrongpass-uk",
    },
    defaultTransferAmount: 15.0,
  },

  features: {
    strictPasswordPolicy: true,
    billPayEnabled: false,
  },

  timeouts: {
    actionMs: 10_000,
    navigationMs: 30_000,
    apiRequestMs: 15_000,
  },
};
