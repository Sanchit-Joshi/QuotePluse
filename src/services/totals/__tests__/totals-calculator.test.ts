import { describe, expect, it } from "vitest";
import { calculateTotals } from "../totals-calculator";

describe("calculateTotals", () => {
  it("splits GST into CGST+SGST for intra-state customers", () => {
    const result = calculateTotals({
      lineItems: [
        { quantity: 2, unitPricePaise: 50000, discountPct: 0, gstRate: 18 },
      ],
      companyState: "Maharashtra",
      customerState: "Maharashtra",
    });

    // 2 * 50000 = 100000 paise subtotal, 18% GST = 18000 paise total
    expect(result.subtotalPaise).toBe(100000);
    expect(result.cgstPaise + result.sgstPaise).toBe(18000);
    expect(result.cgstPaise).toBe(9000);
    expect(result.sgstPaise).toBe(9000);
    expect(result.igstPaise).toBe(0);
    expect(result.grandTotalPaise).toBe(118000);
  });

  it("charges full rate as IGST for inter-state customers", () => {
    const result = calculateTotals({
      lineItems: [
        { quantity: 1, unitPricePaise: 100000, discountPct: 0, gstRate: 18 },
      ],
      companyState: "Maharashtra",
      customerState: "Karnataka",
    });

    expect(result.cgstPaise).toBe(0);
    expect(result.sgstPaise).toBe(0);
    expect(result.igstPaise).toBe(18000);
    expect(result.grandTotalPaise).toBe(118000);
  });

  it("state comparison is case-insensitive and whitespace-tolerant", () => {
    const result = calculateTotals({
      lineItems: [
        { quantity: 1, unitPricePaise: 100000, discountPct: 0, gstRate: 18 },
      ],
      companyState: " Maharashtra ",
      customerState: "maharashtra",
    });
    expect(result.igstPaise).toBe(0);
    expect(result.cgstPaise).toBe(9000);
  });

  it("applies per-line discount before tax", () => {
    const result = calculateTotals({
      lineItems: [
        { quantity: 1, unitPricePaise: 100000, discountPct: 10, gstRate: 18 },
      ],
      companyState: "MH",
      customerState: "MH",
    });

    // 100000 - 10% = 90000 taxable, 18% of 90000 = 16200
    expect(result.discountPaise).toBe(10000);
    expect(result.taxableValuePaise).toBe(90000);
    expect(result.cgstPaise + result.sgstPaise).toBe(16200);
    expect(result.grandTotalPaise).toBe(106200);
  });

  it("applies document-level discount proportionally across lines", () => {
    const result = calculateTotals({
      lineItems: [
        { quantity: 1, unitPricePaise: 100000, discountPct: 0, gstRate: 18 },
        { quantity: 1, unitPricePaise: 100000, discountPct: 0, gstRate: 0 },
      ],
      documentDiscountPct: 10,
      companyState: "MH",
      customerState: "MH",
    });

    // subtotal 200000, doc discount 10% = 20000, taxable 180000
    expect(result.subtotalPaise).toBe(200000);
    expect(result.discountPaise).toBe(20000);
    expect(result.taxableValuePaise).toBe(180000);
    // only line 1 (18% gst) contributes tax, on its taxable share (90000)
    expect(result.cgstPaise + result.sgstPaise).toBe(16200);
  });

  it("never produces floating point totals (all outputs are integers)", () => {
    const result = calculateTotals({
      lineItems: [
        { quantity: 3, unitPricePaise: 33333, discountPct: 7, gstRate: 18 },
        { quantity: 1.5, unitPricePaise: 12345, discountPct: 3.33, gstRate: 12 },
      ],
      documentDiscountPct: 2.5,
      companyState: "Delhi",
      customerState: "Gujarat",
    });

    for (const value of [
      result.subtotalPaise,
      result.discountPaise,
      result.taxableValuePaise,
      result.cgstPaise,
      result.sgstPaise,
      result.igstPaise,
      result.grandTotalPaise,
      result.roundingPaise,
    ]) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("never rounds the grand total to the nearest rupee (matches the client's real invoices, which show exact paise, not a Round Off line)", () => {
    const result = calculateTotals({
      lineItems: [
        { quantity: 1, unitPricePaise: 10037, discountPct: 0, gstRate: 18 },
      ],
      companyState: "MH",
      customerState: "MH",
    });
    expect(result.roundingPaise).toBe(0);
    expect(result.grandTotalPaise).toBe(
      result.taxableValuePaise + result.cgstPaise + result.sgstPaise + result.igstPaise,
    );
  });

  it("computes GST once on the group taxable value, not summed per-line roundings (matches `=Subtotal*9%`)", () => {
    // Three lines at an odd per-line taxable amount that would round
    // differently if GST were computed and rounded per line vs. once on
    // the combined taxable value.
    const result = calculateTotals({
      lineItems: [
        { quantity: 1, unitPricePaise: 1001, discountPct: 0, gstRate: 18 },
        { quantity: 1, unitPricePaise: 1001, discountPct: 0, gstRate: 18 },
        { quantity: 1, unitPricePaise: 1001, discountPct: 0, gstRate: 18 },
      ],
      companyState: "MH",
      customerState: "MH",
    });
    // taxable = 3003, 18% of 3003 = 540.54 -> rounds once to 541 (270+271
    // CGST/SGST split), NOT 3x round(1001*0.18=180.18->180)=540.
    expect(result.cgstPaise + result.sgstPaise).toBe(541);
  });

  describe("golden-master: client reference invoices (docs/decision-log.md ADR-009)", () => {
    it("matches SAI2526000049 SBI BETAWAD FRFC.xlsx exactly", () => {
      // 2 x Rs.611.00 (in paise: 61100) = subtotal 122200 paise (Rs.1222.00)
      // CGST 9% = 10998, SGST 9% = 10998, Total = 144196 (Rs.1441.96)
      const result = calculateTotals({
        lineItems: [{ quantity: 2, unitPricePaise: 6110000, discountPct: 0, gstRate: 18 }],
        companyState: "Maharashtra",
        customerState: "Maharashtra",
      });
      expect(result.subtotalPaise).toBe(12220000);
      expect(result.cgstPaise).toBe(1099800);
      expect(result.sgstPaise).toBe(1099800);
      expect(result.grandTotalPaise).toBe(14419600);
    });

    it("matches SBI Nandurbar.xlsx exactly", () => {
      // 13 x Rs.4000.00 = subtotal 52000, CGST 9% = 4680, SGST 9% = 4680,
      // Total = 61360.
      const result = calculateTotals({
        lineItems: [{ quantity: 13, unitPricePaise: 400000, discountPct: 0, gstRate: 18 }],
        companyState: "Maharashtra",
        customerState: "Maharashtra",
      });
      expect(result.subtotalPaise).toBe(5200000);
      expect(result.cgstPaise).toBe(468000);
      expect(result.sgstPaise).toBe(468000);
      expect(result.grandTotalPaise).toBe(6136000);
    });
  });

  it("handles an empty line-item list (draft with no items yet)", () => {
    const result = calculateTotals({
      lineItems: [],
      companyState: "MH",
      customerState: "MH",
    });
    expect(result.subtotalPaise).toBe(0);
    expect(result.grandTotalPaise).toBe(0);
  });

  it("produces a non-empty amount-in-words string", () => {
    const result = calculateTotals({
      lineItems: [
        { quantity: 1, unitPricePaise: 12345600, discountPct: 0, gstRate: 0 },
      ],
      companyState: "MH",
      customerState: "MH",
    });
    expect(result.amountInWords.length).toBeGreaterThan(0);
    expect(result.amountInWords).toContain("Rupees");
  });
});
