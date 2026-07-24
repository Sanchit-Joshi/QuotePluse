import { z } from "zod";
import { emailSchema, optionalGstinSchema, phoneSchema } from "./common.schema";

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  gstin: optionalGstinSchema,
  billingAddress: z.string().trim().min(1, "Billing address is required"),
  shippingAddress: z.string().trim().optional(),
  state: z.string().trim().min(1, "State is required"),
  phone: phoneSchema,
  email: emailSchema,
  referenceCode: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export const customerUpdateSchema = customerInputSchema.partial();
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
