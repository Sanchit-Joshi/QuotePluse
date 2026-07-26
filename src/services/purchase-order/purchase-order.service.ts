import { prisma } from "@/lib/prisma";
import { ConflictError, ImmutableDocumentError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  PurchaseOrderRepository,
  type PurchaseOrderDetail,
  type PurchaseOrderListFilters,
} from "@/repositories/purchase-order.repository";
import { CompanyRepository } from "@/repositories/company.repository";
import { calculateTotals } from "@/services/totals/totals-calculator";
import { numberingService } from "@/services/numbering/numbering.service";
import { auditService } from "@/services/audit/audit.service";
import { AuditAction, AuditEntityType, DocumentType, PurchaseOrderStatus } from "@/generated/prisma/enums";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PurchaseOrderInput, PurchaseOrderUpdateInput } from "@/validators/purchase-order.schema";

const repo = new PurchaseOrderRepository(prisma);
const companyRepo = new CompanyRepository(prisma);

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Purchase orders don't vary tax treatment by vendor state the way
 * quotations/invoices do for the client's real customers (the reference PO
 * this was modeled on shows a flat combined GST regardless) — but the same
 * calculateTotals() engine is reused for consistency and future reporting,
 * with vendor state passed through so intra/inter-state still computes
 * correctly if it ever needs to be surfaced.
 */
async function buildLineItemRows(_db: Db, input: PurchaseOrderInput, vendorState: string) {
  const company = await companyRepo.getOrCreateSingleton();
  const totals = calculateTotals({
    lineItems: input.lineItems,
    documentDiscountPct: input.documentDiscountPct,
    companyState: company.state,
    customerState: vendorState,
  });
  return { totals, company };
}

function toLineItemCreateRows(
  lineItems: ReturnType<typeof calculateTotals>["lineItems"],
  original: PurchaseOrderInput["lineItems"],
): Prisma.PurchaseOrderLineItemUncheckedCreateWithoutPurchaseOrderInput[] {
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
 * Encapsulates the Purchase Order state machine:
 * DRAFT -> SENT (finalize, allocates number) -> CANCELLED
 * Simpler than Quotation/Invoice — no APPROVED/PAID/CONVERTED steps, since
 * a PO's own fulfillment (goods received, vendor paid) is tracked outside
 * this app for now.
 */
export class PurchaseOrderService {
  list(filters: PurchaseOrderListFilters) {
    return repo.list(filters);
  }

  async getOrThrow(id: string): Promise<PurchaseOrderDetail> {
    const po = await repo.findById(id);
    if (!po) throw new NotFoundError("PurchaseOrder", id);
    return po;
  }

  versions(id: string) {
    return repo.versions(id);
  }

  async createDraft(input: PurchaseOrderInput): Promise<PurchaseOrderDetail> {
    return prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findFirst({ where: { id: input.vendorId, deletedAt: null } });
      if (!vendor) throw new NotFoundError("Vendor", input.vendorId);

      const { totals } = await buildLineItemRows(tx, input, vendor.state);

      const po = await tx.purchaseOrder.create({
        data: {
          vendorId: input.vendorId,
          status: PurchaseOrderStatus.DRAFT,
          issueDate: input.issueDate,
          deliveryDate: input.deliveryDate,
          shippingBy: input.shippingBy,
          shippingTerms: input.shippingTerms,
          deliveryAddress: input.deliveryAddress,
          notes: input.notes,
          terms: input.terms,
          paymentTerms: input.paymentTerms,
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
        include: { vendor: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.PURCHASE_ORDER,
        entityId: po.id,
        action: AuditAction.CREATE,
      });

      return po;
    });
  }

  async update(id: string, input: PurchaseOrderUpdateInput): Promise<PurchaseOrderDetail> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { vendor: true, lineItems: true },
      });
      if (!existing) throw new NotFoundError("PurchaseOrder", id);
      if (existing.status === PurchaseOrderStatus.CANCELLED) {
        throw new ImmutableDocumentError("Cannot edit a cancelled purchase order");
      }

      const vendorId = input.vendorId ?? existing.vendorId;
      const vendor = await tx.vendor.findFirst({ where: { id: vendorId, deletedAt: null } });
      if (!vendor) throw new NotFoundError("Vendor", vendorId);

      const lineItems = input.lineItems ?? existing.lineItems.map((li) => ({
        itemId: li.itemId ?? undefined,
        description: li.description,
        hsnSac: li.hsnSac ?? undefined,
        quantity: Number(li.quantity),
        unitPricePaise: li.unitPricePaise,
        discountPct: Number(li.discountPct),
        gstRate: Number(li.gstRate),
      }));

      const mergedInput: PurchaseOrderInput = {
        vendorId,
        issueDate: input.issueDate ?? existing.issueDate,
        deliveryDate: input.deliveryDate ?? existing.deliveryDate ?? undefined,
        shippingBy: input.shippingBy ?? existing.shippingBy ?? undefined,
        shippingTerms: input.shippingTerms ?? existing.shippingTerms ?? undefined,
        deliveryAddress: input.deliveryAddress ?? existing.deliveryAddress ?? undefined,
        lineItems,
        documentDiscountPct: input.documentDiscountPct ?? Number(existing.documentDiscountPct),
        notes: input.notes ?? existing.notes ?? undefined,
        terms: input.terms ?? existing.terms ?? undefined,
        paymentTerms: input.paymentTerms ?? existing.paymentTerms ?? undefined,
      };

      const { totals } = await buildLineItemRows(tx, mergedInput, vendor.state);

      if (existing.number) {
        await tx.purchaseOrderVersion.create({
          data: {
            purchaseOrderId: id,
            versionNumber: existing.version,
            snapshot: existing as unknown as Prisma.InputJsonValue,
          },
        });
      }

      await tx.purchaseOrderLineItem.deleteMany({ where: { purchaseOrderId: id } });

      const po = await tx.purchaseOrder.update({
        where: { id },
        data: {
          vendorId,
          issueDate: mergedInput.issueDate,
          deliveryDate: mergedInput.deliveryDate,
          shippingBy: mergedInput.shippingBy,
          shippingTerms: mergedInput.shippingTerms,
          deliveryAddress: mergedInput.deliveryAddress,
          notes: mergedInput.notes,
          terms: mergedInput.terms,
          paymentTerms: mergedInput.paymentTerms,
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
        include: { vendor: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.PURCHASE_ORDER,
        entityId: id,
        action: AuditAction.UPDATE,
      });

      return po;
    });
  }

  async finalize(id: string): Promise<PurchaseOrderDetail> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({ where: { id }, include: { lineItems: true } });
      if (!existing) throw new NotFoundError("PurchaseOrder", id);
      if (existing.status !== PurchaseOrderStatus.DRAFT) {
        throw new ConflictError("Only a draft purchase order can be finalized");
      }
      if (existing.lineItems.length === 0) {
        throw new ValidationError("At least one line item is required to finalize", {
          lineItems: "Add at least one line item",
        });
      }

      const company = await companyRepo.getOrCreateSingleton();
      const number = await numberingService.nextNumber(tx, company.id, DocumentType.PURCHASE_ORDER);

      const po = await tx.purchaseOrder.update({
        where: { id },
        data: { number, status: PurchaseOrderStatus.SENT },
        include: { vendor: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.PURCHASE_ORDER,
        entityId: id,
        action: AuditAction.STATUS_CHANGE,
        metadata: { from: "DRAFT", to: "SENT", number },
      });

      return po;
    });
  }

  async duplicate(id: string): Promise<PurchaseOrderDetail> {
    return prisma.$transaction(async (tx) => {
      const source = await tx.purchaseOrder.findUnique({ where: { id }, include: { lineItems: true } });
      if (!source) throw new NotFoundError("PurchaseOrder", id);

      const po = await tx.purchaseOrder.create({
        data: {
          vendorId: source.vendorId,
          status: PurchaseOrderStatus.DRAFT,
          issueDate: new Date(),
          deliveryDate: source.deliveryDate,
          shippingBy: source.shippingBy,
          shippingTerms: source.shippingTerms,
          deliveryAddress: source.deliveryAddress,
          notes: source.notes,
          terms: source.terms,
          paymentTerms: source.paymentTerms,
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
        include: { vendor: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.PURCHASE_ORDER,
        entityId: po.id,
        action: AuditAction.CREATE,
        metadata: { duplicatedFrom: id },
      });

      return po;
    });
  }

  async updateStatus(id: string, status: "CANCELLED"): Promise<PurchaseOrderDetail> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("PurchaseOrder", id);

      const legalFrom: Record<string, PurchaseOrderStatus[]> = {
        CANCELLED: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SENT],
      };
      if (!legalFrom[status].includes(existing.status)) {
        throw new ConflictError(`Cannot move purchase order from ${existing.status} to ${status}`);
      }

      const po = await tx.purchaseOrder.update({
        where: { id },
        data: { status },
        include: { vendor: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.PURCHASE_ORDER,
        entityId: id,
        action: AuditAction.STATUS_CHANGE,
        metadata: { from: existing.status, to: status },
      });

      return po;
    });
  }
}

export const purchaseOrderService = new PurchaseOrderService();
