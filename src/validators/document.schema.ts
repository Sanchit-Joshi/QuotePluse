import { z } from "zod";
import { gstRateSchema, paiseSchema, percentSchema } from "./common.schema";

/**
 * Shared line-item and document shape for both Quotations and Invoices
 * (FR-3, FR-4). A document must have at least one line item to be finalized,
 * but drafts may be saved with zero (FR-3.4/FR-10.1) — that laxer rule is
 * enforced by the service layer, not this schema, since the same schema is
 * used for both draft-save and finalize-time validation.
 */
export const lineItemInputSchema = z.object({
  itemId: z.string().cuid().optional(),
  description: z.string().trim().min(1, "Description is required").max(500),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitPricePaise: paiseSchema,
  discountPct: percentSchema.default(0),
  gstRate: gstRateSchema,
});

export type LineItemInput = z.infer<typeof lineItemInputSchema>;

export const documentInputSchema = z.object({
  customerId: z.string().cuid("Customer is required"),
  issueDate: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  lineItems: z.array(lineItemInputSchema).default([]),
  documentDiscountPct: percentSchema.default(0),
  notes: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(4000).optional(),
});

export type DocumentInput = z.infer<typeof documentInputSchema>;

export const documentUpdateSchema = documentInputSchema.partial();
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;

export const quotationStatusUpdateSchema = z.object({
  status: z.enum(["APPROVED", "CANCELLED"]),
});

export const invoiceStatusUpdateSchema = z.object({
  status: z.enum(["PENDING", "PAID", "CANCELLED"]),
  paidDate: z.coerce.date().optional(),
});
