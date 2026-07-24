import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { quotationService } from "../quotation.service";
import { ConflictError, ImmutableDocumentError, ValidationError } from "@/lib/errors";
import type { DocumentInput } from "@/validators/document.schema";

/**
 * Integration tests against the local dev PostgreSQL (docker-compose /
 * `quotation-postgres-dev`). Exercises the state machine end-to-end
 * (DRAFT -> SENT -> APPROVED/CANCELLED/CONVERTED) including numbering
 * allocation and totals persistence, not just mocked collaborators.
 */

let customerId: string;
const createdQuotationIds: string[] = [];
const createdInvoiceIds: string[] = [];

function baseInput(overrides: Partial<DocumentInput> = {}): DocumentInput {
  return {
    customerId,
    issueDate: new Date("2026-07-25"),
    lineItems: [
      { description: "Consulting", quantity: 2, unitPricePaise: 500000, discountPct: 0, gstRate: 18 },
    ],
    documentDiscountPct: 0,
    ...overrides,
  };
}

beforeAll(async () => {
  const customer = await prisma.customer.create({
    data: {
      name: "Test Customer (quotation.service.test)",
      billingAddress: "Test Address",
      state: "Test State",
    },
  });
  customerId = customer.id;
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
  await prisma.quotation.deleteMany({ where: { id: { in: createdQuotationIds } } });
  await prisma.customer.delete({ where: { id: customerId } });
});

describe("QuotationService", () => {
  it("creates a draft with computed totals and no number", async () => {
    const quotation = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(quotation.id);

    expect(quotation.status).toBe("DRAFT");
    expect(quotation.number).toBeNull();
    expect(quotation.subtotalPaise).toBe(1000000);
    expect(quotation.grandTotalPaise).toBe(1180000);
  });

  it("rejects finalize with zero line items", async () => {
    const quotation = await quotationService.createDraft(baseInput({ lineItems: [] }));
    createdQuotationIds.push(quotation.id);

    await expect(quotationService.finalize(quotation.id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("allocates a sequential number on finalize and transitions to SENT", async () => {
    const quotation = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(quotation.id);

    const finalized = await quotationService.finalize(quotation.id);
    expect(finalized.status).toBe("SENT");
    expect(finalized.number).toMatch(/^QTN-\d{4}-\d{4}$/);
  });

  it("rejects finalizing an already-finalized quotation", async () => {
    const quotation = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(quotation.id);
    await quotationService.finalize(quotation.id);

    await expect(quotationService.finalize(quotation.id)).rejects.toBeInstanceOf(ConflictError);
  });

  it("only allows APPROVED/CANCELLED from SENT, not from DRAFT", async () => {
    const draft = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(draft.id);

    await expect(quotationService.updateStatus(draft.id, "APPROVED")).rejects.toBeInstanceOf(ConflictError);
  });

  it("approves a sent quotation and then allows cancellation", async () => {
    const quotation = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(quotation.id);
    await quotationService.finalize(quotation.id);

    const approved = await quotationService.updateStatus(quotation.id, "APPROVED");
    expect(approved.status).toBe("APPROVED");

    const cancelled = await quotationService.updateStatus(quotation.id, "CANCELLED");
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("prevents editing a cancelled quotation (immutability)", async () => {
    const quotation = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(quotation.id);
    await quotationService.finalize(quotation.id);
    await quotationService.updateStatus(quotation.id, "CANCELLED");

    await expect(
      quotationService.update(quotation.id, { notes: "changed" }),
    ).rejects.toBeInstanceOf(ImmutableDocumentError);
  });

  it("writes a version snapshot when editing a finalized quotation", async () => {
    const quotation = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(quotation.id);
    await quotationService.finalize(quotation.id);

    await quotationService.update(quotation.id, { notes: "updated notes" });
    const versions = await quotationService.versions(quotation.id);
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });

  it("duplicates a quotation as a fresh draft with no number", async () => {
    const quotation = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(quotation.id);
    await quotationService.finalize(quotation.id);

    const duplicate = await quotationService.duplicate(quotation.id);
    createdQuotationIds.push(duplicate.id);

    expect(duplicate.status).toBe("DRAFT");
    expect(duplicate.number).toBeNull();
    expect(duplicate.grandTotalPaise).toBe(quotation.grandTotalPaise);
  });

  it("converts a sent quotation into a draft invoice and marks it CONVERTED", async () => {
    const quotation = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(quotation.id);
    await quotationService.finalize(quotation.id);

    const { invoiceId } = await quotationService.convertToInvoice(quotation.id);
    createdInvoiceIds.push(invoiceId);

    const converted = await quotationService.getOrThrow(quotation.id);
    expect(converted.status).toBe("CONVERTED");
    expect(converted.convertedToInvoiceId).toBe(invoiceId);

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.status).toBe("DRAFT");
    expect(invoice.grandTotalPaise).toBe(quotation.grandTotalPaise);
  });

  it("rejects converting a draft (never-sent) quotation", async () => {
    const quotation = await quotationService.createDraft(baseInput());
    createdQuotationIds.push(quotation.id);

    await expect(quotationService.convertToInvoice(quotation.id)).rejects.toBeInstanceOf(ConflictError);
  });
});
