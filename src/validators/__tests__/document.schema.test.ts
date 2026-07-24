import { describe, expect, it } from "vitest";
import { documentInputSchema, lineItemInputSchema } from "../document.schema";

const VALID_LINE_ITEM = {
  description: "Consulting",
  quantity: 2,
  unitPricePaise: 500000,
  gstRate: 18,
};

const VALID_DOCUMENT = {
  customerId: "clh3am1yn0000qzrmn831i7d1",
  issueDate: "2026-07-25",
  lineItems: [VALID_LINE_ITEM],
};

describe("lineItemInputSchema", () => {
  it("defaults discountPct to 0 when omitted", () => {
    const result = lineItemInputSchema.parse(VALID_LINE_ITEM);
    expect(result.discountPct).toBe(0);
  });

  it("rejects a zero or negative quantity", () => {
    expect(lineItemInputSchema.safeParse({ ...VALID_LINE_ITEM, quantity: 0 }).success).toBe(false);
    expect(lineItemInputSchema.safeParse({ ...VALID_LINE_ITEM, quantity: -1 }).success).toBe(false);
  });

  it("rejects an empty description", () => {
    expect(lineItemInputSchema.safeParse({ ...VALID_LINE_ITEM, description: "" }).success).toBe(false);
  });
});

describe("documentInputSchema", () => {
  it("accepts a minimal valid document", () => {
    expect(documentInputSchema.safeParse(VALID_DOCUMENT).success).toBe(true);
  });

  it("accepts an empty line-item list (draft with no items yet, FR-3.4)", () => {
    const result = documentInputSchema.safeParse({ ...VALID_DOCUMENT, lineItems: [] });
    expect(result.success).toBe(true);
  });

  it("rejects a non-cuid customerId", () => {
    expect(documentInputSchema.safeParse({ ...VALID_DOCUMENT, customerId: "not-an-id" }).success).toBe(false);
  });

  it("coerces a date string into a Date", () => {
    const result = documentInputSchema.parse(VALID_DOCUMENT);
    expect(result.issueDate).toBeInstanceOf(Date);
  });

  it("rejects a document discount above 100", () => {
    expect(
      documentInputSchema.safeParse({ ...VALID_DOCUMENT, documentDiscountPct: 150 }).success,
    ).toBe(false);
  });
});
