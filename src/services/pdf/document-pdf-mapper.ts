import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { formatPaiseAsCurrency, paiseToAmountInWords } from "@/lib/money";
import { CompanyRepository } from "@/repositories/company.repository";
import { QuotationRepository, type QuotationDetail } from "@/repositories/quotation.repository";
import { InvoiceRepository, type InvoiceDetail } from "@/repositories/invoice.repository";
import type { CompanyWithRelations } from "@/repositories/company.repository";
import type { DocumentPdfData } from "@/templates/document-pdf/types";

const quotationRepo = new QuotationRepository(prisma);
const invoiceRepo = new InvoiceRepository(prisma);
const companyRepo = new CompanyRepository(prisma);

function fmt(paise: number): string {
  return formatPaiseAsCurrency(paise);
}

/** Effective rate label derived from the computed amount, e.g. "9" — matches literal per-line rates exactly for uniform-rate documents (the client's real invoices always are). */
function rateLabel(taxPaise: number, taxableValuePaise: number): string {
  if (taxableValuePaise <= 0) return "0";
  const pct = (taxPaise / taxableValuePaise) * 100;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(2);
}

/** Only set when every line shares the same non-empty HSN/SAC (matches the client's single "HSN CODE - xxxx" header). */
function uniformHsnSac(lineItems: { hsnSac: string | null }[]): string | undefined {
  const codes = new Set(lineItems.map((li) => li.hsnSac?.trim()).filter(Boolean));
  return codes.size === 1 ? [...codes][0] : undefined;
}

interface CompanyBlock {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  state: string;
  gstin?: string;
  logoUrl?: string;
  signatoryName?: string;
  signatureUrl?: string;
  bank?: { accountName: string; accountNumber: string; ifsc: string; bankName: string; branch: string };
}

function toCompanyBlock(company: CompanyWithRelations): CompanyBlock {
  return {
    name: company.name,
    addressLine1: company.addressLine1,
    addressLine2: company.addressLine2 ?? undefined,
    state: company.state,
    gstin: company.gstin ?? undefined,
    logoUrl: company.logoUrl ?? undefined,
    signatoryName: company.signatoryName ?? undefined,
    signatureUrl: company.signatureUrl ?? undefined,
    bank: company.bankDetail ?? undefined,
  };
}

function toCustomerBlock(customer: QuotationDetail["customer"] | InvoiceDetail["customer"]) {
  return {
    name: customer.name,
    billingAddress: customer.billingAddress,
    shippingAddress: customer.shippingAddress ?? undefined,
    state: customer.state,
    gstin: customer.gstin ?? undefined,
    phone: customer.phone ?? undefined,
    email: customer.email ?? undefined,
    referenceCode: customer.referenceCode ?? undefined,
  };
}

/**
 * Maps a persisted Quotation/Invoice + Company into the framework-agnostic
 * DocumentPdfData shape consumed by DocumentTemplate. Shared by PdfService
 * (Playwright print) and the in-app preview page (direct SSR) so both
 * render from identical data (FR-6.1). Layout matches the client's real
 * reference invoices — see docs/decision-log.md ADR-009.
 */
export async function mapQuotationToPdfData(id: string): Promise<{ data: DocumentPdfData; entityId: string }> {
  const quotation = await quotationRepo.findById(id);
  if (!quotation) throw new NotFoundError("Quotation", id);
  const company = await companyRepo.getOrCreateSingleton();
  const taxableValuePaise = quotation.subtotalPaise - quotation.discountPaise;

  const data: DocumentPdfData = {
    documentTypeLabel: "Quotation",
    number: quotation.number ?? "DRAFT",
    issueDate: quotation.issueDate.toLocaleDateString("en-IN"),
    secondaryDate: quotation.validUntil
      ? { label: "Valid Until", value: quotation.validUntil.toLocaleDateString("en-IN") }
      : undefined,
    status: quotation.status,
    company: toCompanyBlock(company),
    customer: toCustomerBlock(quotation.customer),
    uniformHsnSac: uniformHsnSac(quotation.lineItems),
    lineItems: quotation.lineItems.map((li) => ({
      description: li.description,
      hsnSac: li.hsnSac ?? undefined,
      quantity: String(li.quantity),
      unit: "",
      unitPrice: fmt(li.unitPricePaise),
      discountPct: `${li.discountPct}`,
      gstRate: `${li.gstRate}`,
      lineTotal: fmt(li.lineTotalPaise),
    })),
    subtotal: fmt(quotation.subtotalPaise),
    discount: fmt(quotation.discountPaise),
    taxableValue: fmt(taxableValuePaise),
    cgst: fmt(quotation.cgstPaise),
    sgst: fmt(quotation.sgstPaise),
    igst: fmt(quotation.igstPaise),
    cgstRateLabel: rateLabel(quotation.cgstPaise, taxableValuePaise),
    sgstRateLabel: rateLabel(quotation.sgstPaise, taxableValuePaise),
    igstRateLabel: rateLabel(quotation.igstPaise, taxableValuePaise),
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
  const taxableValuePaise = invoice.subtotalPaise - invoice.discountPaise;

  const data: DocumentPdfData = {
    documentTypeLabel: "Tax Invoice",
    number: invoice.number ?? "DRAFT",
    issueDate: invoice.issueDate.toLocaleDateString("en-IN"),
    secondaryDate: invoice.dueDate
      ? { label: "Due Date", value: invoice.dueDate.toLocaleDateString("en-IN") }
      : undefined,
    status: invoice.status,
    company: toCompanyBlock(company),
    customer: toCustomerBlock(invoice.customer),
    uniformHsnSac: uniformHsnSac(invoice.lineItems),
    lineItems: invoice.lineItems.map((li) => ({
      description: li.description,
      hsnSac: li.hsnSac ?? undefined,
      quantity: String(li.quantity),
      unit: "",
      unitPrice: fmt(li.unitPricePaise),
      discountPct: `${li.discountPct}`,
      gstRate: `${li.gstRate}`,
      lineTotal: fmt(li.lineTotalPaise),
    })),
    subtotal: fmt(invoice.subtotalPaise),
    discount: fmt(invoice.discountPaise),
    taxableValue: fmt(taxableValuePaise),
    cgst: fmt(invoice.cgstPaise),
    sgst: fmt(invoice.sgstPaise),
    igst: fmt(invoice.igstPaise),
    cgstRateLabel: rateLabel(invoice.cgstPaise, taxableValuePaise),
    sgstRateLabel: rateLabel(invoice.sgstPaise, taxableValuePaise),
    igstRateLabel: rateLabel(invoice.igstPaise, taxableValuePaise),
    rounding: fmt(invoice.roundingPaise),
    grandTotal: fmt(invoice.grandTotalPaise),
    amountInWords: paiseToAmountInWords(invoice.grandTotalPaise),
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
  };

  return { data, entityId: invoice.id };
}
