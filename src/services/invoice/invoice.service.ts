import { prisma } from "@/lib/prisma";
import { ConflictError, ImmutableDocumentError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  InvoiceRepository,
  type InvoiceDetail,
  type InvoiceListFilters,
} from "@/repositories/invoice.repository";
import { CompanyRepository } from "@/repositories/company.repository";
import { calculateTotals } from "@/services/totals/totals-calculator";
import { numberingService } from "@/services/numbering/numbering.service";
import { auditService } from "@/services/audit/audit.service";
import {
  AuditAction,
  AuditEntityType,
  DocumentType,
  InvoiceStatus,
  PurchaseOrderStatus,
} from "@/generated/prisma/enums";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { DocumentInput, DocumentUpdateInput } from "@/validators/document.schema";

const repo = new InvoiceRepository(prisma);
const companyRepo = new CompanyRepository(prisma);

type Db = PrismaClient | Prisma.TransactionClient;

async function computeTotalsFor(_db: Db, input: DocumentInput, customerState: string) {
  const company = await companyRepo.getOrCreateSingleton();
  const totals = calculateTotals({
    lineItems: input.lineItems,
    documentDiscountPct: input.documentDiscountPct,
    companyState: company.state,
    customerState,
  });
  return { totals, company };
}

function toLineItemCreateRows(
  lineItems: ReturnType<typeof calculateTotals>["lineItems"],
  original: DocumentInput["lineItems"],
): Prisma.InvoiceLineItemUncheckedCreateWithoutInvoiceInput[] {
  return lineItems.map((computed, i) => ({
    itemId: original[i].itemId,
    description: original[i].description,
    hsnSac: original[i].hsnSac,
    quantity: original[i].quantity,
    unitPricePaise: original[i].unitPricePaise,
    discountPct: original[i].discountPct,
    gstRate: original[i].gstRate,
    lineTotalPaise: computed.lineTotalPaise,
    sortOrder: i,
  }));
}

/**
 * Encapsulates the Invoice state machine (FR-4.2):
 * DRAFT -> PENDING (finalize, allocates number) -> PAID | CANCELLED
 */
export class InvoiceService {
  list(filters: InvoiceListFilters) {
    return repo.list(filters);
  }

  async getOrThrow(id: string): Promise<InvoiceDetail> {
    const invoice = await repo.findById(id);
    if (!invoice) throw new NotFoundError("Invoice", id);
    return invoice;
  }

  versions(id: string) {
    return repo.versions(id);
  }

  async createDraft(input: DocumentInput): Promise<InvoiceDetail> {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: input.customerId, deletedAt: null } });
      if (!customer) throw new NotFoundError("Customer", input.customerId);

      const { totals } = await computeTotalsFor(tx, input, customer.state);

      const invoice = await tx.invoice.create({
        data: {
          customerId: input.customerId,
          status: InvoiceStatus.DRAFT,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          notes: input.notes,
          terms: input.terms,
          subtotalPaise: totals.subtotalPaise,
          discountPaise: totals.discountPaise,
          documentDiscountPct: input.documentDiscountPct ?? 0,
          cgstPaise: totals.cgstPaise,
          sgstPaise: totals.sgstPaise,
          igstPaise: totals.igstPaise,
          roundingPaise: totals.roundingPaise,
          grandTotalPaise: totals.grandTotalPaise,
          lineItems: { create: toLineItemCreateRows(totals.lineItems, input.lineItems) },
        },
        include: { customer: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.INVOICE,
        entityId: invoice.id,
        action: AuditAction.CREATE,
      });

      return invoice;
    });
  }

  async update(id: string, input: DocumentUpdateInput): Promise<InvoiceDetail> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({
        where: { id },
        include: { customer: true, lineItems: true },
      });
      if (!existing) throw new NotFoundError("Invoice", id);
      if (existing.status === InvoiceStatus.CANCELLED) {
        throw new ImmutableDocumentError("Cannot edit a cancelled invoice");
      }

      const customerId = input.customerId ?? existing.customerId;
      const customer = await tx.customer.findFirst({ where: { id: customerId, deletedAt: null } });
      if (!customer) throw new NotFoundError("Customer", customerId);

      const lineItems = input.lineItems ?? existing.lineItems.map((li) => ({
        itemId: li.itemId ?? undefined,
        description: li.description,
        hsnSac: li.hsnSac ?? undefined,
        quantity: Number(li.quantity),
        unitPricePaise: li.unitPricePaise,
        discountPct: Number(li.discountPct),
        gstRate: Number(li.gstRate),
      }));

      const mergedInput: DocumentInput = {
        customerId,
        issueDate: input.issueDate ?? existing.issueDate,
        dueDate: input.dueDate ?? existing.dueDate ?? undefined,
        lineItems,
        documentDiscountPct: input.documentDiscountPct ?? Number(existing.documentDiscountPct),
        notes: input.notes ?? existing.notes ?? undefined,
        terms: input.terms ?? existing.terms ?? undefined,
      };

      const { totals } = await computeTotalsFor(tx, mergedInput, customer.state);

      if (existing.number) {
        await tx.invoiceVersion.create({
          data: {
            invoiceId: id,
            versionNumber: existing.version,
            snapshot: existing as unknown as Prisma.InputJsonValue,
          },
        });
      }

      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });

      const invoice = await tx.invoice.update({
        where: { id },
        data: {
          customerId,
          issueDate: mergedInput.issueDate,
          dueDate: mergedInput.dueDate,
          notes: mergedInput.notes,
          terms: mergedInput.terms,
          subtotalPaise: totals.subtotalPaise,
          discountPaise: totals.discountPaise,
          documentDiscountPct: mergedInput.documentDiscountPct,
          cgstPaise: totals.cgstPaise,
          sgstPaise: totals.sgstPaise,
          igstPaise: totals.igstPaise,
          roundingPaise: totals.roundingPaise,
          grandTotalPaise: totals.grandTotalPaise,
          version: existing.number ? existing.version + 1 : existing.version,
          lineItems: { create: toLineItemCreateRows(totals.lineItems, mergedInput.lineItems) },
        },
        include: { customer: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.INVOICE,
        entityId: id,
        action: AuditAction.UPDATE,
      });

      return invoice;
    });
  }

  async finalize(id: string): Promise<InvoiceDetail> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id }, include: { lineItems: true } });
      if (!existing) throw new NotFoundError("Invoice", id);
      if (existing.status !== InvoiceStatus.DRAFT) {
        throw new ConflictError("Only a draft invoice can be finalized");
      }
      if (existing.lineItems.length === 0) {
        throw new ValidationError("At least one line item is required to finalize", {
          lineItems: "Add at least one line item",
        });
      }

      const company = await companyRepo.getOrCreateSingleton();
      const number = await numberingService.nextNumber(tx, company.id, DocumentType.INVOICE);

      const invoice = await tx.invoice.update({
        where: { id },
        data: { number, status: InvoiceStatus.PENDING },
        include: { customer: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.INVOICE,
        entityId: id,
        action: AuditAction.STATUS_CHANGE,
        metadata: { from: "DRAFT", to: "PENDING", number },
      });

      return invoice;
    });
  }

  async duplicate(id: string): Promise<InvoiceDetail> {
    return prisma.$transaction(async (tx) => {
      const source = await tx.invoice.findUnique({ where: { id }, include: { lineItems: true } });
      if (!source) throw new NotFoundError("Invoice", id);

      const invoice = await tx.invoice.create({
        data: {
          customerId: source.customerId,
          status: InvoiceStatus.DRAFT,
          issueDate: new Date(),
          dueDate: source.dueDate,
          notes: source.notes,
          terms: source.terms,
          subtotalPaise: source.subtotalPaise,
          discountPaise: source.discountPaise,
          documentDiscountPct: source.documentDiscountPct,
          cgstPaise: source.cgstPaise,
          sgstPaise: source.sgstPaise,
          igstPaise: source.igstPaise,
          roundingPaise: source.roundingPaise,
          grandTotalPaise: source.grandTotalPaise,
          lineItems: {
            create: source.lineItems.map((li, i) => ({
              itemId: li.itemId,
              description: li.description,
              hsnSac: li.hsnSac,
              quantity: li.quantity,
              unitPricePaise: li.unitPricePaise,
              discountPct: li.discountPct,
              gstRate: li.gstRate,
              lineTotalPaise: li.lineTotalPaise,
              sortOrder: i,
            })),
          },
        },
        include: { customer: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.INVOICE,
        entityId: invoice.id,
        action: AuditAction.CREATE,
        metadata: { duplicatedFrom: id },
      });

      return invoice;
    });
  }

  async updateStatus(
    id: string,
    status: "PENDING" | "PAID" | "CANCELLED",
    paidDate?: Date,
  ): Promise<InvoiceDetail> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("Invoice", id);

      const legalFrom: Record<string, InvoiceStatus[]> = {
        PENDING: [InvoiceStatus.DRAFT],
        PAID: [InvoiceStatus.PENDING],
        CANCELLED: [InvoiceStatus.PENDING, InvoiceStatus.DRAFT],
      };
      if (!legalFrom[status].includes(existing.status)) {
        throw new ConflictError(`Cannot move invoice from ${existing.status} to ${status}`);
      }
      if (status === "PAID" && !paidDate) {
        throw new ValidationError("paidDate is required when marking an invoice PAID", {
          paidDate: "Required",
        });
      }

      const invoice = await tx.invoice.update({
        where: { id },
        data: { status, paidDate: status === "PAID" ? paidDate : existing.paidDate },
        include: { customer: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.INVOICE,
        entityId: id,
        action: AuditAction.STATUS_CHANGE,
        metadata: { from: existing.status, to: status },
      });

      return invoice;
    });
  }

  /**
   * Creates a DRAFT purchase order to a vendor from this invoice's line
   * items — same dealer-restocking rationale as
   * QuotationService.convertToPurchaseOrder. Does not change the invoice's
   * own status (an invoice stays valid/payable regardless of whether stock
   * is separately reordered from a vendor to fulfill it) — only guarded
   * against converting the same invoice to a PO twice. Pricing is zeroed
   * on the new PO's line items for the same reason as the quotation path:
   * what we billed the customer has no relationship to vendor cost.
   */
  async convertToPurchaseOrder(id: string, vendorId: string): Promise<{ purchaseOrderId: string }> {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id }, include: { lineItems: true } });
      if (!invoice) throw new NotFoundError("Invoice", id);
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new ConflictError("Cannot convert a cancelled invoice to a purchase order");
      }
      if (invoice.convertedToPurchaseOrderId) {
        throw new ConflictError("This invoice has already been converted to a purchase order");
      }
      const vendor = await tx.vendor.findFirst({ where: { id: vendorId, deletedAt: null } });
      if (!vendor) throw new NotFoundError("Vendor", vendorId);

      const po = await tx.purchaseOrder.create({
        data: {
          vendorId,
          status: PurchaseOrderStatus.DRAFT,
          issueDate: new Date(),
          notes: invoice.notes,
          terms: invoice.terms,
          lineItems: {
            create: invoice.lineItems.map((li, i) => ({
              itemId: li.itemId,
              description: li.description,
              hsnSac: li.hsnSac,
              quantity: li.quantity,
              unitPricePaise: 0,
              discountPct: 0,
              gstRate: li.gstRate,
              lineTotalPaise: 0,
              sortOrder: i,
            })),
          },
        },
      });

      await tx.invoice.update({
        where: { id },
        data: { convertedToPurchaseOrderId: po.id },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.INVOICE,
        entityId: id,
        action: AuditAction.UPDATE,
        metadata: { convertedToPurchaseOrderId: po.id },
      });
      await auditService.record(tx, {
        entityType: AuditEntityType.PURCHASE_ORDER,
        entityId: po.id,
        action: AuditAction.CREATE,
        metadata: { convertedFromInvoiceId: id },
      });

      return { purchaseOrderId: po.id };
    });
  }
}

export const invoiceService = new InvoiceService();
