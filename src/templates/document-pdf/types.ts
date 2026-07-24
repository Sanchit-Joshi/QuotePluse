/**
 * Normalized, framework-agnostic data shape consumed by DocumentTemplate.
 * Both the PDF service and the in-app preview page map their respective
 * Prisma entities into this shape, guaranteeing the two rendering paths
 * (Playwright print vs. browser preview) show identical content (FR-6.1).
 */
export interface DocumentPdfLineItem {
  description: string;
  hsnSac?: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discountPct: string;
  gstRate: string;
  lineTotal: string;
}

export interface DocumentPdfData {
  documentTypeLabel: "Quotation" | "Tax Invoice";
  number: string;
  issueDate: string;
  secondaryDate?: { label: string; value: string };
  status: string;

  company: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    state: string;
    gstin?: string;
    logoUrl?: string;
    signatoryName?: string;
    signatureUrl?: string;
    bank?: {
      accountName: string;
      accountNumber: string;
      ifsc: string;
      bankName: string;
      branch: string;
    };
  };

  customer: {
    name: string;
    billingAddress: string;
    shippingAddress?: string;
    state: string;
    gstin?: string;
    phone?: string;
    email?: string;
    /** Vendor/reference code this customer assigned to us (ADR-009), e.g. "VENDOR CODE-RAJE5945734". */
    referenceCode?: string;
  };

  /** Shown once in the header only when every line item shares the same HSN/SAC (matches the client's real invoices). */
  uniformHsnSac?: string;

  lineItems: DocumentPdfLineItem[];

  subtotal: string;
  discount: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  /** Effective rate labels, e.g. "9" for a 9% CGST line — derived from the actual computed amounts so mixed-rate documents still show a sensible blended percentage. */
  cgstRateLabel: string;
  sgstRateLabel: string;
  igstRateLabel: string;
  rounding: string;
  grandTotal: string;
  amountInWords: string;

  notes?: string;
  terms?: string;
}
