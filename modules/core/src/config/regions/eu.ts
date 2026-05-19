import type { RegionConfig } from "../schema.js";

/**
 * European Union region.
 *
 * Demonstrates a region with stricter password rules and a different currency
 * & locale. Backed by the same ParaBank demo for this exercise - in
 * production, this would be a separate EU-hosted deployment satisfying the
 * same API contract (the framework doesn't care).
 */
export const eu: RegionConfig = {
  id: "eu",
  displayName: "European Union",

  webBaseUrl: "https://parabank.parasoft.com/parabank",
  apiBaseUrl: "https://parabank.parasoft.com/parabank/services_proxy/bank",

  currency: "EUR",
  locale: "de-DE",
  timezoneId: "Europe/Berlin",

  testData: {
    primaryUser: {
      username: "john",
      password: "demo",
      customerId: 12212,
    },
    invalidUser: {
      username: "nobody",
      password: "wrongpass-eu",
    },
    defaultTransferAmount: 20.0,
  },

  features: {
    strictPasswordPolicy: true,
    billPayEnabled: true,
  },

  timeouts: {
    actionMs: 12_000,
    navigationMs: 35_000,
    apiRequestMs: 20_000,
  },
};
