import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { dashboardService } from "../dashboard.service";
import { quotationService } from "@/services/quotation/quotation.service";

let customerId: string;
let quotationId: string;

beforeAll(async () => {
  const customer = await prisma.customer.create({
    data: { name: "Dashboard Test Co", billingAddress: "1 Test Way", state: "Test State" },
  });
  customerId = customer.id;

  const quotation = await quotationService.createDraft({
    customerId,
    issueDate: new Date(),
    lineItems: [{ description: "Item", quantity: 1, unitPricePaise: 100000, discountPct: 0, gstRate: 18 }],
    documentDiscountPct: 0,
  });
  quotationId = quotation.id;
  await quotationService.finalize(quotationId);
});

afterAll(async () => {
  await prisma.quotation.delete({ where: { id: quotationId } });
  await prisma.customer.delete({ where: { id: customerId } });
});

describe("DashboardService.summary", () => {
  it("counts the finalized quotation under its status for the current month", async () => {
    const summary = await dashboardService.summary("month");
    expect(summary.counts.SENT).toBeGreaterThanOrEqual(1);
    expect(summary.amounts.SENT).toBeGreaterThanOrEqual(118000);
  });

  it("includes the quotation in the recent documents list", async () => {
    const summary = await dashboardService.summary("month");
    expect(summary.recent.some((d) => d.id === quotationId && d.type === "QUOTATION")).toBe(true);
  });

  it("supports the quarter period without throwing", async () => {
    await expect(dashboardService.summary("quarter")).resolves.toBeDefined();
  });
});
