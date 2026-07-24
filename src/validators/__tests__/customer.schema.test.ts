import { describe, expect, it } from "vitest";
import { customerInputSchema } from "../customer.schema";

const VALID = {
  name: "Acme Pvt Ltd",
  billingAddress: "123 Main St",
  state: "Maharashtra",
};

describe("customerInputSchema", () => {
  it("accepts a minimal valid customer", () => {
    const result = customerInputSchema.safeParse(VALID);
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = customerInputSchema.safeParse({ ...VALID, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed GSTIN", () => {
    const result = customerInputSchema.safeParse({ ...VALID, gstin: "not-a-gstin" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid GSTIN", () => {
    const result = customerInputSchema.safeParse({ ...VALID, gstin: "22AAAAA0000A1Z5" });
    expect(result.success).toBe(true);
  });

  it("allows an empty-string GSTIN (treated as not provided)", () => {
    const result = customerInputSchema.safeParse({ ...VALID, gstin: "" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = customerInputSchema.safeParse({ ...VALID, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing billing address", () => {
    const result = customerInputSchema.safeParse({ name: "Acme", state: "MH" });
    expect(result.success).toBe(false);
  });
});
