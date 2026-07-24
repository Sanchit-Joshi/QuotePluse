import { z } from "zod";

/**
 * Client-side form schema for the quotation/invoice editor. Deliberately
 * separate from validators/document.schema.ts (the API's source-of-truth
 * schema): that schema uses z.coerce.date(), whose input/output types
 * diverge and break react-hook-form's zodResolver generics. Dates here stay
 * as plain `<input type="date">` strings and are converted to ISO dates by
 * the caller right before the API request. Numeric business rules (percent
 * ranges, GST rate bounds) are still shared via validators/common.schema.ts
 * constants mirrored below.
 */
export const lineItemFormSchema = z.object({
  itemId: z.string().optional(),
  description: z.string().trim().min(1, "Description is required"),
  hsnSac: z.string().optional(),
  quantity: z.number().positive("Must be greater than zero"),
  unitPricePaise: z.number().int().min(0),
  discountPct: z.number().min(0).max(100),
  gstRate: z.number().min(0).max(28),
});

export const documentFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  secondaryDate: z.string().optional(),
  lineItems: z.array(lineItemFormSchema),
  documentDiscountPct: z.number().min(0).max(100),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export type LineItemFormValues = z.infer<typeof lineItemFormSchema>;
export type DocumentFormValues = z.infer<typeof documentFormSchema>;
