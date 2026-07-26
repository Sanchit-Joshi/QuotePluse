import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { formatPaiseAsCurrency } from "@/lib/money";
import { CompanyRepository } from "@/repositories/company.repository";
import { PurchaseOrderRepository } from "@/repositories/purchase-order.repository";
import type { PurchaseOrderPdfData, PurchaseOrderPdfLineItem } from "@/templates/purchase-order-pdf/types";

const purchaseOrderRepo = new PurchaseOrderRepository(prisma);
const companyRepo = new CompanyRepository(prisma);

function fmt(paise: number): string {
  return formatPaiseAsCurrency(paise);
}

function round(n: number): number {
  return Math.round(n);
}

/** Only set when every line shares the same non-empty HSN/SAC (matches the client's single "HSN CODE - xxxx" header pattern used on quotations/invoices). */
function uniformHsnSac(lineItems: { hsnSac: string | null }[]): string | undefined {
  const codes = new Set(lineItems.map((li) => li.hsnSac?.trim()).filter(Boolean));
  return codes.size === 1 ? [...codes][0] : undefined;
}

/**
 * Computes the per-line Basic Price / Discount / Net Basic / GST / Total
 * breakdown the reference PO shows in its line-items table. Deliberately
 * NOT calculateTotals() (services/totals/totals-calculator.ts): that engine
 * groups tax by rate across the whole document to avoid cross-line rounding
 * drift, which is right for quotations/invoices (where only the document
 * totals box shows GST) but wrong here — the PO table shows GST computed
 * per line, so each line's tax must be rounded independently to match.
 */
function computeLineBreakdown(li: {
  quantity: unknown;
  unitPricePaise: number;
  discountPct: unknown;
  gstRate: unknown;
}): { netBasicPaise: number; gstPaise: number; totalPaise: number } {
  const quantity = Number(li.quantity);
  const discountPct = Number(li.discountPct);
  const gstRate = Number(li.gstRate);

  const grossPaise = round(quantity * li.unitPricePaise);
  const discountPaise = round((grossPaise * discountPct) / 100);
  const netBasicPaise = grossPaise - discountPaise;
  const gstPaise = round((netBasicPaise * gstRate) / 100);
  const totalPaise = netBasicPaise + gstPaise;

  return { netBasicPaise, gstPaise, totalPaise };
}

export async function mapPurchaseOrderToPdfData(
  id: string,
): Promise<{ data: PurchaseOrderPdfData; entityId: string }> {
  const po = await purchaseOrderRepo.findById(id);
  if (!po) throw new NotFoundError("PurchaseOrder", id);
  const company = await companyRepo.getOrCreateSingleton();

  let grandTotalPaise = 0;
  const lineItems: PurchaseOrderPdfLineItem[] = po.lineItems.map((li) => {
    const { netBasicPaise, gstPaise, totalPaise } = computeLineBreakdown(li);
    grandTotalPaise += totalPaise;
    return {
      description: li.description,
      hsnSac: li.hsnSac ?? undefined,
      quantity: String(li.quantity),
      basicPrice: fmt(li.unitPricePaise),
      discountPct: `${Number(li.discountPct)}%`,
      netBasic: fmt(netBasicPaise),
      gstAmount: fmt(gstPaise),
      gstRateLabel: `${Number(li.gstRate)}`,
      total: fmt(totalPaise),
    };
  });

  const data: PurchaseOrderPdfData = {
    number: po.number ?? "DRAFT",
    issueDate: po.issueDate.toLocaleDateString("en-IN"),
    deliveryDate: po.deliveryDate ? po.deliveryDate.toLocaleDateString("en-IN") : undefined,
    company: {
      name: company.name,
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2 ?? undefined,
      state: company.state,
      gstin: company.gstin ?? undefined,
      logoUrl: company.logoUrl ?? undefined,
      signatoryName: company.signatoryName ?? undefined,
      signatureUrl: company.signatureUrl ?? undefined,
    },
    vendor: {
      name: po.vendor.name,
      address: po.vendor.address,
      state: po.vendor.state,
      gstin: po.vendor.gstin ?? undefined,
    },
    shippingBy: po.shippingBy ?? undefined,
    shippingTerms: po.shippingTerms ?? undefined,
    deliveryAddress: po.deliveryAddress ?? undefined,
    uniformHsnSac: uniformHsnSac(po.lineItems),
    lineItems,
    totalAmount: fmt(grandTotalPaise),
    notes: po.notes ?? undefined,
    terms: po.terms ?? undefined,
    paymentTerms: po.paymentTerms ?? undefined,
  };

  return { data, entityId: po.id };
}
