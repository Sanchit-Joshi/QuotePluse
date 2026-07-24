import { describe, expect, it } from "vitest";
import { companyService } from "../company.service";
import { DocumentType } from "@/generated/prisma/enums";

describe("CompanyService", () => {
  it("getOrCreateSingleton always returns the same company row", async () => {
    const first = await companyService.getProfile();
    const second = await companyService.getProfile();
    expect(second.id).toBe(first.id);
  });

  it("seeds QUOTATION and INVOICE numbering sequences for the singleton company", async () => {
    await companyService.getProfile();
    const sequences = await companyService.listNumbering();
    const types = sequences.map((s) => s.documentType);
    expect(types).toContain(DocumentType.QUOTATION);
    expect(types).toContain(DocumentType.INVOICE);
  });

  it("updates the company profile", async () => {
    const company = await companyService.getProfile();
    const updated = await companyService.updateProfile({
      name: "Updated Test Company",
      addressLine1: company.addressLine1,
      state: company.state,
    });
    expect(updated.name).toBe("Updated Test Company");
  });

  it("updates a numbering sequence's prefix", async () => {
    const updated = await companyService.updateNumbering(DocumentType.QUOTATION, { prefix: "QT" });
    expect(updated.prefix).toBe("QT");

    // restore default prefix so other tests/manual usage aren't affected
    await companyService.updateNumbering(DocumentType.QUOTATION, { prefix: "QTN" });
  });
});
