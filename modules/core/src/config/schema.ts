import { z } from "zod";

// All per-region config lives here. Tests pull a resolved RegionConfig via
// fixtures rather than reading env vars directly.
export const RegionIdSchema = z.enum(["us", "eu", "uk"]);
export type RegionId = z.infer<typeof RegionIdSchema>;

export const TestUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  /** Customer ID assigned by the backend after registration. Optional because
   *  some flows (registration tests) resolve it dynamically. */
  customerId: z.number().int().positive().optional(),
});
export type TestUser = z.infer<typeof TestUserSchema>;

export const RegionConfigSchema = z.object({
  id: RegionIdSchema,
  displayName: z.string().min(1),

  webBaseUrl: z.string().url(),
  /** Backend REST API base URL - may equal webBaseUrl if the API is mounted
   *  on the same host (as with ParaBank), or differ for split deployments. */
  apiBaseUrl: z.string().url(),

  /** ISO 4217 currency code expected to appear in UI labels & API responses. */
  currency: z.enum(["USD", "EUR", "GBP"]),
  /** BCP-47 locale tag - feeds Playwright's `locale` context option. */
  locale: z.string().min(2),
  /** Timezone for browser context - affects any date rendering. */
  timezoneId: z.string().min(1),

  /** Region-specific test data fixtures. These are static, low-stakes accounts
   *  expected to exist in the target environment. In a real deployment, each
   *  region would have its own pool of provisioned test users. */
  testData: z.object({
    /** Primary login user for happy-path tests. */
    primaryUser: TestUserSchema,
    /** Known-invalid credentials for error-path tests. */
    invalidUser: TestUserSchema,
    /** Default transfer amount (in major currency units) used by smoke tests. */
    defaultTransferAmount: z.number().positive(),
  }),

  /** Regional feature flags / behavioural toggles. Tests gate assertions on
   *  these so a feature available only in `eu` doesn't fail in `us`. */
  features: z.object({
    /** Some regions enforce stricter password rules at registration time. */
    strictPasswordPolicy: z.boolean(),
    /** Whether bill pay is exposed to customers in this region. */
    billPayEnabled: z.boolean(),
  }),

  /** Per-region timeout overrides - slower regions can bump these without
   *  affecting other regions or test code. */
  timeouts: z.object({
    actionMs: z.number().int().positive(),
    navigationMs: z.number().int().positive(),
    apiRequestMs: z.number().int().positive(),
  }),
});

export type RegionConfig = z.infer<typeof RegionConfigSchema>;
