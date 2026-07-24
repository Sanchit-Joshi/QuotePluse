import { prisma } from "@/lib/prisma";
import { ConflictError, ImmutableDocumentError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  QuotationRepository,
  type QuotationDetail,
  type QuotationListFilters,
} from "@/repositories/quotation.repository";
import { CompanyRepository } from "@/repositories/company.repository";
import { calculateTotals } from "@/services/totals/totals-calculator";
import { numberingService } from "@/services/numbering/numbering.service";
import { auditService } from "@/services/audit/audit.service";
import {
  AuditAction,
  AuditEntityType,
  DocumentType,
  InvoiceStatus,
  QuotationStatus,
} from "@/generated/prisma/enums";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { DocumentInput, DocumentUpdateInput } from "@/validators/document.schema";

const repo = new QuotationRepository(prisma);
const companyRepo = new CompanyRepository(prisma);

type Db = PrismaClient | Prisma.TransactionClient;

async function buildLineItemRows(db: Db, input: DocumentInput, customerState: string) {
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
): Prisma.QuotationLineItemUncheckedCreateWithoutQuotationInput[] {
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
 * Encapsulates the Quotation state machine (FR-3.3):
 * DRAFT -> SENT (finalize, allocates number) -> APPROVED | CANCELLED
 * APPROVED -> CONVERTED (via convertToInvoice)
 * Route handlers must never mutate `status` directly.
 */
export class QuotationService {
  list(filters: QuotationListFilters) {
    return repo.list(filters);
  }

  async getOrThrow(id: string): Promise<QuotationDetail> {
    const quotation = await repo.findById(id);
    if (!quotation) throw new NotFoundError("Quotation", id);
    return quotation;
  }

  versions(id: string) {
    return repo.versions(id);
  }

  async createDraft(input: DocumentInput): Promise<QuotationDetail> {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: input.customerId, deletedAt: null } });
      if (!customer) throw new NotFoundError("Customer", input.customerId);

      const { totals } = await buildLineItemRows(tx, input, customer.state);

      const quotation = await tx.quotation.create({
        data: {
          customerId: input.customerId,
          status: QuotationStatus.DRAFT,
          issueDate: input.issueDate,
          validUntil: input.validUntil,
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
        entityType: AuditEntityType.QUOTATION,
        entityId: quotation.id,
        action: AuditAction.CREATE,
      });

      return quotation;
    });
  }

  /**
   * Updates a quotation. If it is still a DRAFT, the change applies in
   * place. If it has already been finalized (has a number), the current
   * state is snapshotted into QuotationVersion first (FR-3.7) so the
   * document's history remains auditable even though line items themselves
   * are mutable until CANCELLED/CONVERTED.
   */
  async update(id: string, input: DocumentUpdateInput): Promise<QuotationDetail> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.quotation.findUnique({
        where: { id },
        include: { customer: true, lineItems: true },
      });
      if (!existing) throw new NotFoundError("Quotation", id);
      if (existing.status === QuotationStatus.CANCELLED || existing.status === QuotationStatus.CONVERTED) {
        throw new ImmutableDocumentError(`Cannot edit a ${existing.status.toLowerCase()} quotation`);
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
        validUntil: input.validUntil ?? existing.validUntil ?? undefined,
        lineItems,
        documentDiscountPct: input.documentDiscountPct ?? Number(existing.documentDiscountPct),
        notes: input.notes ?? existing.notes ?? undefined,
        terms: input.terms ?? existing.terms ?? undefined,
      };

      const { totals } = await buildLineItemRows(tx, mergedInput, customer.state);

      if (existing.number) {
        await tx.quotationVersion.create({
          data: {
            quotationId: id,
            versionNumber: existing.version,
            snapshot: existing as unknown as Prisma.InputJsonValue,
          },
        });
      }

      await tx.quotationLineItem.deleteMany({ where: { quotationId: id } });

      const quotation = await tx.quotation.update({
        where: { id },
        data: {
          customerId,
          issueDate: mergedInput.issueDate,
          validUntil: mergedInput.validUntil,
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
        entityType: AuditEntityType.QUOTATION,
        entityId: id,
        action: AuditAction.UPDATE,
      });

      return quotation;
    });
  }

  async finalize(id: string): Promise<QuotationDetail> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.quotation.findUnique({ where: { id }, include: { lineItems: true } });
      if (!existing) throw new NotFoundError("Quotation", id);
      if (existing.status !== QuotationStatus.DRAFT) {
        throw new ConflictError("Only a draft quotation can be finalized");
      }
      if (existing.lineItems.length === 0) {
        throw new ValidationError("At least one line item is required to finalize", {
          lineItems: "Add at least one line item",
        });
      }

      const company = await companyRepo.getOrCreateSingleton();
      const number = await numberingService.nextNumber(tx, company.id, DocumentType.QUOTATION);

      const quotation = await tx.quotation.update({
        where: { id },
        data: { number, status: QuotationStatus.SENT },
        include: { customer: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.QUOTATION,
        entityId: id,
        action: AuditAction.STATUS_CHANGE,
        metadata: { from: "DRAFT", to: "SENT", number },
      });

      return quotation;
    });
  }

  async duplicate(id: string): Promise<QuotationDetail> {
    return prisma.$transaction(async (tx) => {
      const source = await tx.quotation.findUnique({ where: { id }, include: { lineItems: true } });
      if (!source) throw new NotFoundError("Quotation", id);

      const quotation = await tx.quotation.create({
        data: {
          customerId: source.customerId,
          status: QuotationStatus.DRAFT,
          issueDate: new Date(),
          validUntil: source.validUntil,
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
        entityType: AuditEntityType.QUOTATION,
        entityId: quotation.id,
        action: AuditAction.CREATE,
        metadata: { duplicatedFrom: id },
      });

      return quotation;
    });
  }

  async updateStatus(id: string, status: "APPROVED" | "CANCELLED"): Promise<QuotationDetail> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.quotation.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("Quotation", id);

      const legalFrom: Record<string, QuotationStatus[]> = {
        APPROVED: [QuotationStatus.SENT],
        CANCELLED: [QuotationStatus.SENT, QuotationStatus.APPROVED],
      };
      if (!legalFrom[status].includes(existing.status)) {
        throw new ConflictError(`Cannot move quotation from ${existing.status} to ${status}`);
      }

      const quotation = await tx.quotation.update({
        where: { id },
        data: { status },
        include: { customer: true, lineItems: true },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.QUOTATION,
        entityId: id,
        action: AuditAction.STATUS_CHANGE,
        metadata: { from: existing.status, to: status },
      });

      return quotation;
    });
  }

  /**
   * Converts an approved/sent quotation into a new DRAFT invoice (FR-3.6),
   * copying customer + line items 1:1. The source quotation is marked
   * CONVERTED and linked via convertedToInvoiceId so it can no longer be
   * edited or converted again.
   */
  async convertToInvoice(id: string): Promise<{ invoiceId: string }> {
    return prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({ where: { id }, include: { lineItems: true } });
      if (!quotation) throw new NotFoundError("Quotation", id);
      if (quotation.status !== QuotationStatus.SENT && quotation.status !== QuotationStatus.APPROVED) {
        throw new ConflictError("Only a sent or approved quotation can be converted to an invoice");
      }

      const invoice = await tx.invoice.create({
        data: {
          customerId: quotation.customerId,
          status: InvoiceStatus.DRAFT,
          issueDate: new Date(),
          notes: quotation.notes,
          terms: quotation.terms,
          subtotalPaise: quotation.subtotalPaise,
          discountPaise: quotation.discountPaise,
          documentDiscountPct: quotation.documentDiscountPct,
          cgstPaise: quotation.cgstPaise,
          sgstPaise: quotation.sgstPaise,
          igstPaise: quotation.igstPaise,
          roundingPaise: quotation.roundingPaise,
          grandTotalPaise: quotation.grandTotalPaise,
          lineItems: {
            create: quotation.lineItems.map((li, i) => ({
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
      });

      await tx.quotation.update({
        where: { id },
        data: { status: QuotationStatus.CONVERTED, convertedToInvoiceId: invoice.id },
      });

      await auditService.record(tx, {
        entityType: AuditEntityType.QUOTATION,
        entityId: id,
        action: AuditAction.STATUS_CHANGE,
        metadata: { from: quotation.status, to: "CONVERTED", invoiceId: invoice.id },
      });
      await auditService.record(tx, {
        entityType: AuditEntityType.INVOICE,
        entityId: invoice.id,
        action: AuditAction.CREATE,
        metadata: { convertedFromQuotationId: id },
      });

      return { invoiceId: invoice.id };
    });
  }
}

export const quotationService = new QuotationService();
