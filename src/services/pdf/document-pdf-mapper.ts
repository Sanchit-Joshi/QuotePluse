import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { formatPaiseAsCurrency, paiseToAmountInWords } from "@/lib/money";
import { CompanyRepository } from "@/repositories/company.repository";
import { QuotationRepository } from "@/repositories/quotation.repository";
import { InvoiceRepository } from "@/repositories/invoice.repository";
import type { DocumentPdfData } from "@/templates/document-pdf/types";

const quotationRepo = new QuotationRepository(prisma);
const invoiceRepo = new InvoiceRepository(prisma);
const companyRepo = new CompanyRepository(prisma);

function fmt(paise: number): string {
  return formatPaiseAsCurrency(paise);
}

/**
 * Maps a persisted Quotation/Invoice + Company into the framework-agnostic
 * DocumentPdfData shape consumed by DocumentTemplate. Shared by PdfService
 * (Playwright print) and the in-app preview page (direct SSR) so both
 * render from identical data (FR-6.1).
 */
export async function mapQuotationToPdfData(id: string): Promise<{ data: DocumentPdfData; entityId: string }> {
  const quotation = await quotationRepo.findById(id);
  if (!quotation) throw new NotFoundError("Quotation", id);
  const company = await companyRepo.getOrCreateSingleton();

  const data: DocumentPdfData = {
    documentTypeLabel: "Quotation",
    number: quotation.number ?? "DRAFT",
    issueDate: quotation.issueDate.toLocaleDateString("en-IN"),
    secondaryDate: quotation.validUntil
      ? { label: "Valid Until", value: quotation.validUntil.toLocaleDateString("en-IN") }
      : undefined,
    status: quotation.status,
    company: {
      name: company.name,
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2 ?? undefined,
      state: company.state,
      gstin: company.gstin ?? undefined,
      logoUrl: company.logoUrl ?? undefined,
      signatoryName: company.signatoryName ?? undefined,
      signatureUrl: company.signatureUrl ?? undefined,
      bank: company.bankDetail ?? undefined,
    },
    customer: {
      name: quotation.customer.name,
      billingAddress: quotation.customer.billingAddress,
      shippingAddress: quotation.customer.shippingAddress ?? undefined,
      state: quotation.customer.state,
      gstin: quotation.customer.gstin ?? undefined,
      phone: quotation.customer.phone ?? undefined,
      email: quotation.customer.email ?? undefined,
    },
    lineItems: quotation.lineItems.map((li) => ({
      description: li.description,
      quantity: String(li.quantity),
      unit: "",
      unitPrice: fmt(li.unitPricePaise),
      discountPct: `${li.discountPct}`,
      gstRate: `${li.gstRate}`,
      lineTotal: fmt(li.lineTotalPaise),
    })),
    subtotal: fmt(quotation.subtotalPaise),
    discount: fmt(quotation.discountPaise),
    taxableValue: fmt(quotation.subtotalPaise - quotation.discountPaise),
    cgst: fmt(quotation.cgstPaise),
    sgst: fmt(quotation.sgstPaise),
    igst: fmt(quotation.igstPaise),
    rounding: fmt(quotation.roundingPaise),
    grandTotal: fmt(quotation.grandTotalPaise),
    amountInWords: paiseToAmountInWords(quotation.grandTotalPaise),
    notes: quotation.notes ?? undefined,
    terms: quotation.terms ?? undefined,
  };

  return { data, entityId: quotation.id };
}

export async function mapInvoiceToPdfData(id: string): Promise<{ data: DocumentPdfData; entityId: string }> {
  const invoice = await invoiceRepo.findById(id);
  if (!invoice) throw new NotFoundError("Invoice", id);
  const company = await companyRepo.getOrCreateSingleton();

  const data: DocumentPdfData = {
    documentTypeLabel: "Tax Invoice",
    number: invoice.number ?? "DRAFT",
    issueDate: invoice.issueDate.toLocaleDateString("en-IN"),
    secondaryDate: invoice.dueDate
      ? { label: "Due Date", value: invoice.dueDate.toLocaleDateString("en-IN") }
      : undefined,
    status: invoice.status,
    company: {
      name: company.name,
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2 ?? undefined,
      state: company.state,
      gstin: company.gstin ?? undefined,
      logoUrl: company.logoUrl ?? undefined,
      signatoryName: company.signatoryName ?? undefined,
      signatureUrl: company.signatureUrl ?? undefined,
      bank: company.bankDetail ?? undefined,
    },
    customer: {
      name: invoice.customer.name,
      billingAddress: invoice.customer.billingAddress,
      shippingAddress: invoice.customer.shippingAddress ?? undefined,
      state: invoice.customer.state,
      gstin: invoice.customer.gstin ?? undefined,
      phone: invoice.customer.phone ?? undefined,
      email: invoice.customer.email ?? undefined,
    },
    lineItems: invoice.lineItems.map((li) => ({
      description: li.description,
      quantity: String(li.quantity),
      unit: "",
      unitPrice: fmt(li.unitPricePaise),
      discountPct: `${li.discountPct}`,
      gstRate: `${li.gstRate}`,
      lineTotal: fmt(li.lineTotalPaise),
    })),
    subtotal: fmt(invoice.subtotalPaise),
    discount: fmt(invoice.discountPaise),
    taxableValue: fmt(invoice.subtotalPaise - invoice.discountPaise),
    cgst: fmt(invoice.cgstPaise),
    sgst: fmt(invoice.sgstPaise),
    igst: fmt(invoice.igstPaise),
    rounding: fmt(invoice.roundingPaise),
    grandTotal: fmt(invoice.grandTotalPaise),
    amountInWords: paiseToAmountInWords(invoice.grandTotalPaise),
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
  };

  return { data, entityId: invoice.id };
}
