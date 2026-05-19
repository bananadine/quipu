import { z } from "zod";

/**
 * Schemas for ParaBank account responses.
 *
 * Why duplicate the API surface as zod schemas? Two reasons:
 *   1. Schema-validation tests can fail with a useful diff when the upstream
 *      response shape drifts - much louder than a downstream NPE.
 *   2. Once the client parses through these, downstream test code gets
 *      typed objects for free.
 */
export const AccountTypeSchema = z.enum(["CHECKING", "SAVINGS", "LOAN"]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const AccountSchema = z.object({
  id: z.number().int(),
  customerId: z.number().int(),
  type: AccountTypeSchema,
  balance: z.number(),
});
export type Account = z.infer<typeof AccountSchema>;

export const AccountListSchema = z.array(AccountSchema);
