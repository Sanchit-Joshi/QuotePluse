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
  };

  lineItems: DocumentPdfLineItem[];

  subtotal: string;
  discount: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  rounding: string;
  grandTotal: string;
  amountInWords: string;

  notes?: string;
  terms?: string;
}
