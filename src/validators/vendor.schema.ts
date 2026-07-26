import { z } from "zod";
import { emailSchema, optionalGstinSchema, phoneSchema } from "./common.schema";

export const vendorInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  gstin: optionalGstinSchema,
  address: z.string().trim().min(1, "Address is required"),
  state: z.string().trim().min(1, "State is required"),
  phone: phoneSchema,
  email: emailSchema,
  notes: z.string().trim().max(2000).optional(),
});

export type VendorInput = z.infer<typeof vendorInputSchema>;

export const vendorUpdateSchema = vendorInputSchema.partial();
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;
