import { describe, expect, it, vi } from "vitest";
import { NumberingService } from "../numbering.service";
import { DocumentType, NumberingResetRule } from "@/generated/prisma/enums";

function makeFakeTx(row: {
  id: string;
  prefix: string;
  nextNumber: number;
  resetRule: NumberingResetRule;
  lastResetYear: number | null;
}) {
  const state = { ...row };
  return {
    $queryRaw: vi.fn(async () => [state]),
    numberingSequence: {
      update: vi.fn(async ({ data }: { data: Partial<typeof state> }) => {
        Object.assign(state, data);
        return state;
      }),
    },
    _state: state,
  };
}

describe("NumberingService.nextNumber", () => {
  it("allocates sequential numbers with never-reset rule", async () => {
    const tx = makeFakeTx({
      id: "seq1",
      prefix: "QTN",
      nextNumber: 1,
      resetRule: NumberingResetRule.NEVER,
      lastResetYear: null,
    });
    const svc = new NumberingService();

    const first = await svc.nextNumber(tx as never, "company1", DocumentType.QUOTATION, new Date("2026-07-25"));
    const second = await svc.nextNumber(tx as never, "company1", DocumentType.QUOTATION, new Date("2026-07-25"));

    expect(first).toBe("QTN-2026-0001");
    expect(second).toBe("QTN-2026-0002");
  });

  it("resets the counter on a new calendar year with YEARLY rule", async () => {
    const tx = makeFakeTx({
      id: "seq2",
      prefix: "INV",
      nextNumber: 42,
      resetRule: NumberingResetRule.YEARLY,
      lastResetYear: 2025,
    });
    const svc = new NumberingService();

    const number = await svc.nextNumber(tx as never, "company1", DocumentType.INVOICE, new Date("2026-01-05"));
    expect(number).toBe("INV-2026-0001");
  });

  it("does not reset within the same calendar year", async () => {
    const tx = makeFakeTx({
      id: "seq3",
      prefix: "INV",
      nextNumber: 5,
      resetRule: NumberingResetRule.YEARLY,
      lastResetYear: 2026,
    });
    const svc = new NumberingService();

    const number = await svc.nextNumber(tx as never, "company1", DocumentType.INVOICE, new Date("2026-07-25"));
    expect(number).toBe("INV-2026-0005");
  });

  it("formats financial-year labels as YYYY-YY and resets on FY boundary", async () => {
    const tx = makeFakeTx({
      id: "seq4",
      prefix: "QTN",
      nextNumber: 10,
      resetRule: NumberingResetRule.FINANCIAL_YEAR,
      lastResetYear: 2025,
    });
    const svc = new NumberingService();

    // April 2026 begins FY2026-27
    const number = await svc.nextNumber(tx as never, "company1", DocumentType.QUOTATION, new Date("2026-04-10"));
    expect(number).toBe("QTN-2026-27-0001");
  });

  it("stays within the same financial year before April", async () => {
    const tx = makeFakeTx({
      id: "seq5",
      prefix: "QTN",
      nextNumber: 3,
      resetRule: NumberingResetRule.FINANCIAL_YEAR,
      lastResetYear: 2025,
    });
    const svc = new NumberingService();

    // Feb 2026 is still FY2025-26 (started April 2025)
    const number = await svc.nextNumber(tx as never, "company1", DocumentType.QUOTATION, new Date("2026-02-10"));
    expect(number).toBe("QTN-2025-26-0003");
  });
});
