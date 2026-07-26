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
  hsnSac: z.string().trim().max(20).optional(),
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

/**
 * `.partial()` alone doesn't make this a true partial-update schema:
 * `lineItems`/`documentDiscountPct` carry `.default(...)` on the base
 * schema, and Zod still applies a field's own default when it's omitted
 * from the parsed input, `.partial()` or not — an omitted field resolves
 * to `[]`/`0`, not `undefined`. Both quotation.service.ts and
 * invoice.service.ts already rely on `input.lineItems ?? existing...`
 * to mean "field not sent, keep the current value" (see `update()` in
 * both), so a defaulted-to-`[]`/`0` value silently replaces real data
 * instead of leaving it alone — confirmed live via ADR-017. Re-declaring
 * both fields here without `.default()` restores that intended contract.
 */
export const documentUpdateSchema = documentInputSchema.partial().extend({
  lineItems: z.array(lineItemInputSchema).optional(),
  documentDiscountPct: percentSchema.optional(),
});
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;

export const quotationStatusUpdateSchema = z.object({
  status: z.enum(["APPROVED", "CANCELLED"]),
});

export const invoiceStatusUpdateSchema = z.object({
  status: z.enum(["PENDING", "PAID", "CANCELLED"]),
  paidDate: z.coerce.date().optional(),
});
