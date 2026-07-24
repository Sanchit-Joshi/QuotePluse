import { describe, expect, it } from "vitest";
import { itemInputSchema } from "../item.schema";

const VALID = {
  name: "Consulting",
  unit: "hr",
  defaultUnitPricePaise: 500000,
  defaultGstRate: 18,
};

describe("itemInputSchema", () => {
  it("accepts a minimal valid item", () => {
    expect(itemInputSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a negative unit price", () => {
    expect(itemInputSchema.safeParse({ ...VALID, defaultUnitPricePaise: -1 }).success).toBe(false);
  });

  it("rejects a non-integer unit price", () => {
    expect(itemInputSchema.safeParse({ ...VALID, defaultUnitPricePaise: 100.5 }).success).toBe(false);
  });

  it("rejects a GST rate above 28", () => {
    expect(itemInputSchema.safeParse({ ...VALID, defaultGstRate: 30 }).success).toBe(false);
  });

  it("rejects an empty unit", () => {
    expect(itemInputSchema.safeParse({ ...VALID, unit: "" }).success).toBe(false);
  });
});
