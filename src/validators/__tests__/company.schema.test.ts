import { describe, expect, it } from "vitest";
import { bankDetailInputSchema, companyInputSchema, numberingUpdateSchema } from "../company.schema";

const VALID_COMPANY = {
  name: "Test Co",
  addressLine1: "1 Main St",
  state: "Maharashtra",
};

describe("companyInputSchema", () => {
  it("accepts a minimal valid company profile", () => {
    expect(companyInputSchema.safeParse(VALID_COMPANY).success).toBe(true);
  });

  it("rejects an empty company name", () => {
    expect(companyInputSchema.safeParse({ ...VALID_COMPANY, name: "" }).success).toBe(false);
  });

  it("accepts an optional bank detail block", () => {
    const result = companyInputSchema.safeParse({
      ...VALID_COMPANY,
      bankDetail: {
        accountName: "Test Co",
        accountNumber: "123456789",
        ifsc: "HDFC0001234",
        bankName: "HDFC Bank",
        branch: "Main Branch",
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("bankDetailInputSchema", () => {
  it("rejects a malformed IFSC code", () => {
    const result = bankDetailInputSchema.safeParse({
      accountName: "Test Co",
      accountNumber: "123456789",
      ifsc: "not-an-ifsc",
      bankName: "HDFC Bank",
      branch: "Main Branch",
    });
    expect(result.success).toBe(false);
  });
});

describe("numberingUpdateSchema", () => {
  it("accepts a partial update", () => {
    expect(numberingUpdateSchema.safeParse({ prefix: "INV" }).success).toBe(true);
  });

  it("rejects an invalid resetRule", () => {
    expect(numberingUpdateSchema.safeParse({ resetRule: "MONTHLY" }).success).toBe(false);
  });
});
