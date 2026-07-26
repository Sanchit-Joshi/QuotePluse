import { z } from "zod";
import { percentSchema } from "./common.schema";
import { lineItemInputSchema } from "./document.schema";

/**
 * Purchase Order input — parallel to DocumentInput (validators/document.schema.ts)
 * but for the vendor-facing PO document: `vendorId` instead of `customerId`,
 * and shipping/delivery/payment fields that quotations/invoices don't have.
 * Line items reuse `lineItemInputSchema` unchanged — same description/qty/
 * price/discount/GST shape, computed with the same calculateTotals() engine.
 */
export const purchaseOrderInputSchema = z.object({
  vendorId: z.string().cuid("Vendor is required"),
  issueDate: z.coerce.date(),
  deliveryDate: z.coerce.date().optional(),
  shippingBy: z.string().trim().max(100).optional(),
  shippingTerms: z.string().trim().max(100).optional(),
  deliveryAddress: z.string().trim().max(1000).optional(),
  lineItems: z.array(lineItemInputSchema).default([]),
  documentDiscountPct: percentSchema.default(0),
  notes: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(4000).optional(),
  paymentTerms: z.string().trim().max(500).optional(),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;

/**
 * See document.schema.ts's documentUpdateSchema comment (ADR-017):
 * `.partial()` alone doesn't strip `.default()` from `lineItems`/
 * `documentDiscountPct`, which would silently replace them with `[]`/`0`
 * on any update that omits them. Re-declared here without defaults for the
 * same reason.
 */
export const purchaseOrderUpdateSchema = purchaseOrderInputSchema.partial().extend({
  lineItems: z.array(lineItemInputSchema).optional(),
  documentDiscountPct: percentSchema.optional(),
});
export type PurchaseOrderUpdateInput = z.infer<typeof purchaseOrderUpdateSchema>;

export const purchaseOrderStatusUpdateSchema = z.object({
  status: z.enum(["CANCELLED"]),
});

/** Body for POST /api/{quotations,invoices}/[id]/convert-to-po — the source document has no vendor of its own. */
export const convertToPurchaseOrderSchema = z.object({
  vendorId: z.string().cuid("Vendor is required"),
});
