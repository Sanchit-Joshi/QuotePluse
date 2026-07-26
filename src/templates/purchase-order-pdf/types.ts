/**
 * Framework-agnostic data shape for the Purchase Order PDF/preview,
 * consumed by both PurchaseOrderTemplate (Playwright print) and
 * PurchaseOrderPdfDocument (react-pdf) — same split as
 * templates/document-pdf/types.ts for quotations/invoices. Modeled
 * directly on the client's real reference PO layout: unlike
 * quotations/invoices there is no CGST/SGST breakdown box, just a flat
 * per-line GST amount and one Total Amount.
 */
export interface PurchaseOrderPdfLineItem {
  description: string;
  hsnSac?: string;
  quantity: string;
  basicPrice: string;
  discountPct: string;
  netBasic: string;
  gstAmount: string;
  gstRateLabel: string;
  total: string;
}

export interface PurchaseOrderPdfData {
  number: string;
  issueDate: string;
  deliveryDate?: string;

  company: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    state: string;
    gstin?: string;
    logoUrl?: string;
    signatoryName?: string;
    signatureUrl?: string;
  };

  vendor: {
    name: string;
    address: string;
    state: string;
    gstin?: string;
  };

  shippingBy?: string;
  shippingTerms?: string;
  deliveryAddress?: string;

  /** Shown once in the header only when every line item shares the same HSN/SAC. */
  uniformHsnSac?: string;

  lineItems: PurchaseOrderPdfLineItem[];

  totalAmount: string;

  notes?: string;
  terms?: string;
  paymentTerms?: string;
}
