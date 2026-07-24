import type { DocumentInput } from "@/validators/document.schema";
import type { DocumentFormValues } from "@/features/documents/document-form.schema";
import type { QuotationDetail } from "@/repositories/quotation.repository";
import type { InvoiceDetail } from "@/repositories/invoice.repository";

function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/** Converts the client form's plain-string dates into the API's DocumentInput shape. */
export function toDocumentInput(values: DocumentFormValues, mode: "quotation" | "invoice"): DocumentInput {
  return {
    customerId: values.customerId,
    issueDate: new Date(values.issueDate),
    ...(mode === "quotation"
      ? { validUntil: values.secondaryDate ? new Date(values.secondaryDate) : undefined }
      : { dueDate: values.secondaryDate ? new Date(values.secondaryDate) : undefined }),
    lineItems: values.lineItems.map((li) => ({
      itemId: li.itemId,
      description: li.description,
      quantity: li.quantity,
      unitPricePaise: li.unitPricePaise,
      discountPct: li.discountPct,
      gstRate: li.gstRate,
    })),
    documentDiscountPct: values.documentDiscountPct,
    notes: values.notes,
    terms: values.terms,
  };
}

export function quotationToFormValues(quotation: QuotationDetail): DocumentFormValues {
  return {
    customerId: quotation.customerId,
    issueDate: toDateInputValue(quotation.issueDate),
    secondaryDate: quotation.validUntil ? toDateInputValue(quotation.validUntil) : undefined,
    lineItems: quotation.lineItems.map((li) => ({
      itemId: li.itemId ?? undefined,
      description: li.description,
      quantity: Number(li.quantity),
      unitPricePaise: li.unitPricePaise,
      discountPct: Number(li.discountPct),
      gstRate: Number(li.gstRate),
    })),
    documentDiscountPct: Number(quotation.documentDiscountPct),
    notes: quotation.notes ?? undefined,
    terms: quotation.terms ?? undefined,
  };
}

export function invoiceToFormValues(invoice: InvoiceDetail): DocumentFormValues {
  return {
    customerId: invoice.customerId,
    issueDate: toDateInputValue(invoice.issueDate),
    secondaryDate: invoice.dueDate ? toDateInputValue(invoice.dueDate) : undefined,
    lineItems: invoice.lineItems.map((li) => ({
      itemId: li.itemId ?? undefined,
      description: li.description,
      quantity: Number(li.quantity),
      unitPricePaise: li.unitPricePaise,
      discountPct: Number(li.discountPct),
      gstRate: Number(li.gstRate),
    })),
    documentDiscountPct: Number(invoice.documentDiscountPct),
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
  };
}
