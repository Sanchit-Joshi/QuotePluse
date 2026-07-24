import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { invoiceService } from "../invoice.service";
import { ConflictError, ValidationError } from "@/lib/errors";
import type { DocumentInput } from "@/validators/document.schema";

let customerId: string;
const createdInvoiceIds: string[] = [];

function baseInput(overrides: Partial<DocumentInput> = {}): DocumentInput {
  return {
    customerId,
    issueDate: new Date("2026-07-25"),
    lineItems: [
      { description: "Consulting", quantity: 1, unitPricePaise: 1000000, discountPct: 0, gstRate: 18 },
    ],
    documentDiscountPct: 0,
    ...overrides,
  };
}

beforeAll(async () => {
  const customer = await prisma.customer.create({
    data: {
      name: "Test Customer (invoice.service.test)",
      billingAddress: "Test Address",
      state: "Test State",
    },
  });
  customerId = customer.id;
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
  await prisma.customer.delete({ where: { id: customerId } });
});

describe("InvoiceService", () => {
  it("creates a draft with computed totals and no number", async () => {
    const invoice = await invoiceService.createDraft(baseInput());
    createdInvoiceIds.push(invoice.id);

    expect(invoice.status).toBe("DRAFT");
    expect(invoice.number).toBeNull();
    expect(invoice.grandTotalPaise).toBe(1180000);
  });

  it("rejects finalize with zero line items", async () => {
    const invoice = await invoiceService.createDraft(baseInput({ lineItems: [] }));
    createdInvoiceIds.push(invoice.id);

    await expect(invoiceService.finalize(invoice.id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("allocates a sequential number on finalize and transitions to PENDING", async () => {
    const invoice = await invoiceService.createDraft(baseInput());
    createdInvoiceIds.push(invoice.id);

    const finalized = await invoiceService.finalize(invoice.id);
    expect(finalized.status).toBe("PENDING");
    expect(finalized.number).toMatch(/^INV-\d{4}-\d{4}$/);
  });

  it("requires a paidDate when marking PAID", async () => {
    const invoice = await invoiceService.createDraft(baseInput());
    createdInvoiceIds.push(invoice.id);
    await invoiceService.finalize(invoice.id);

    await expect(invoiceService.updateStatus(invoice.id, "PAID")).rejects.toBeInstanceOf(ValidationError);
  });

  it("marks a pending invoice PAID with a paid date", async () => {
    const invoice = await invoiceService.createDraft(baseInput());
    createdInvoiceIds.push(invoice.id);
    await invoiceService.finalize(invoice.id);

    const paid = await invoiceService.updateStatus(invoice.id, "PAID", new Date("2026-07-26"));
    expect(paid.status).toBe("PAID");
    expect(paid.paidDate).toEqual(new Date("2026-07-26"));
  });

  it("rejects moving a PAID invoice back to PENDING", async () => {
    const invoice = await invoiceService.createDraft(baseInput());
    createdInvoiceIds.push(invoice.id);
    await invoiceService.finalize(invoice.id);
    await invoiceService.updateStatus(invoice.id, "PAID", new Date());

    await expect(invoiceService.updateStatus(invoice.id, "PENDING")).rejects.toBeInstanceOf(ConflictError);
  });

  it("duplicates an invoice as a fresh draft with no number", async () => {
    const invoice = await invoiceService.createDraft(baseInput());
    createdInvoiceIds.push(invoice.id);
    await invoiceService.finalize(invoice.id);

    const duplicate = await invoiceService.duplicate(invoice.id);
    createdInvoiceIds.push(duplicate.id);

    expect(duplicate.status).toBe("DRAFT");
    expect(duplicate.number).toBeNull();
    expect(duplicate.grandTotalPaise).toBe(invoice.grandTotalPaise);
  });

  it("writes a version snapshot when editing a finalized invoice, and updates line items", async () => {
    const invoice = await invoiceService.createDraft(baseInput());
    createdInvoiceIds.push(invoice.id);
    await invoiceService.finalize(invoice.id);

    const edited = await invoiceService.update(invoice.id, {
      lineItems: [
        { description: "Revised item", quantity: 3, unitPricePaise: 200000, discountPct: 0, gstRate: 18 },
      ],
    });
    expect(edited.subtotalPaise).toBe(600000);
    expect(edited.lineItems).toHaveLength(1);
    expect(edited.lineItems[0].description).toBe("Revised item");

    const versions = await invoiceService.versions(invoice.id);
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });

  it("edits a draft invoice in place without creating a version snapshot", async () => {
    const invoice = await invoiceService.createDraft(baseInput());
    createdInvoiceIds.push(invoice.id);

    await invoiceService.update(invoice.id, { notes: "draft note" });
    const versions = await invoiceService.versions(invoice.id);
    expect(versions).toHaveLength(0);
  });
});
