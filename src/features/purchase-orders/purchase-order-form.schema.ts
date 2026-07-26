import { z } from "zod";
import { lineItemFormSchema } from "@/features/documents/document-form.schema";

/**
 * Client-side form schema for the PO editor — same rationale as
 * document-form.schema.ts for keeping this separate from
 * validators/purchase-order.schema.ts (the API's source-of-truth schema
 * uses z.coerce.date(), which breaks react-hook-form's zodResolver
 * generics). Reuses lineItemFormSchema unchanged since line items are
 * identical in shape to quotations/invoices.
 */
export const purchaseOrderFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  deliveryDate: z.string().optional(),
  shippingBy: z.string().optional(),
  shippingTerms: z.string().optional(),
  deliveryAddress: z.string().optional(),
  lineItems: z.array(lineItemFormSchema),
  documentDiscountPct: z.number().min(0).max(100),
  notes: z.string().optional(),
  terms: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;
