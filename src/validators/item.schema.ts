import { z } from "zod";
import { gstRateSchema, paiseSchema } from "./common.schema";

export const itemInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
  hsnSac: z.string().trim().max(20).optional(),
  unit: z.string().trim().min(1, "Unit is required").max(20),
  defaultUnitPricePaise: paiseSchema,
  defaultGstRate: gstRateSchema,
});

export type ItemInput = z.infer<typeof itemInputSchema>;

export const itemUpdateSchema = itemInputSchema.partial();
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
