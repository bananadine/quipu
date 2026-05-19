import { z } from "zod";

/**
 * Schemas for ParaBank transaction & transfer responses.
 */
export const TransactionTypeSchema = z.enum(["Credit", "Debit"]);

export const TransactionSchema = z.object({
  id: z.number().int(),
  accountId: z.number().int(),
  type: TransactionTypeSchema,
  date: z.union([z.string(), z.number()]),
  amount: z.number(),
  description: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const TransactionListSchema = z.array(TransactionSchema);

/**
 * Structured result returned by ParaBankClient.transfer().
 *
 * ParaBank's transfer endpoint returns plain text, not JSON, so this is a
 * plain TypeScript type (not a zod schema) - there's no untrusted payload
 * to validate, just a synthetic wrapper the client constructs.
 */
export type TransferResult = {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  message: string;
};
