import { z } from "zod";

/**
 * Schema for ParaBank customer profile response.
 *
 * The address sub-object is its own schema so test assertions can target
 * sub-fields with precise error messages when something drifts.
 */
export const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
});

export const CustomerSchema = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  address: AddressSchema,
  phoneNumber: z.string(),
  ssn: z.string(),
});
export type Customer = z.infer<typeof CustomerSchema>;
