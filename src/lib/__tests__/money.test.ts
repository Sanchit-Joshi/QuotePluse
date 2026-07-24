import { describe, expect, it } from "vitest";
import { paiseToAmountInWords, rupeesToIndianWords, rupeesToPaise, paiseToRupees } from "../money";

describe("money conversions", () => {
  it("converts rupees to paise and back without drift", () => {
    expect(rupeesToPaise(100.5)).toBe(10050);
    expect(paiseToRupees(10050)).toBe(100.5);
  });
});

describe("rupeesToIndianWords", () => {
  it("handles zero", () => {
    expect(rupeesToIndianWords(0)).toBe("Zero");
  });

  it("handles simple two-digit numbers", () => {
    expect(rupeesToIndianWords(42)).toBe("Forty Two");
  });

  it("handles thousands", () => {
    expect(rupeesToIndianWords(1234)).toBe("One Thousand Two Hundred Thirty Four");
  });

  it("handles lakhs", () => {
    expect(rupeesToIndianWords(123456)).toBe(
      "One Lakh Twenty Three Thousand Four Hundred Fifty Six",
    );
  });

  it("handles crores", () => {
    expect(rupeesToIndianWords(10000000)).toBe("One Crore");
  });
});

describe("paiseToAmountInWords", () => {
  it("appends Only when there are no paise", () => {
    expect(paiseToAmountInWords(100000)).toBe("One Thousand Rupees Only");
  });

  it("includes paise portion when present", () => {
    expect(paiseToAmountInWords(100050)).toBe(
      "One Thousand Rupees and Fifty Paise Only",
    );
  });
});
