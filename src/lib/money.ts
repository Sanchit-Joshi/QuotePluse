/**
 * All monetary values in this app are stored and computed as integer paise
 * (1 rupee = 100 paise) to avoid floating point rounding drift. These helpers
 * are the only place rupee <-> paise conversion and display formatting happen.
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatPaiseAsCurrency(paise: number): string {
  return INR_FORMATTER.format(paiseToRupees(paise));
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${TENS[tens]}${ones ? " " + ONES[ones] : ""}`;
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigitsToWords(rest));
  return parts.join(" ");
}

/**
 * Converts an integer rupee amount into Indian numbering words (lakh/crore
 * grouping), e.g. 123456 -> "One Lakh Twenty Three Thousand Four Hundred
 * Fifty Six". Used for the mandatory "Amount in Words" line on the PDF.
 */
export function rupeesToIndianWords(rupees: number): string {
  if (rupees === 0) return "Zero";

  const crore = Math.floor(rupees / 1_00_00_000);
  const lakh = Math.floor((rupees % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((rupees % 1_00_000) / 1_000);
  const hundred = rupees % 1_000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return parts.join(" ");
}

export function paiseToAmountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const remainingPaise = paise % 100;
  const rupeeWords = `${rupeesToIndianWords(rupees)} Rupees`;
  if (remainingPaise === 0) {
    return `${rupeeWords} Only`;
  }
  return `${rupeeWords} and ${twoDigitsToWords(remainingPaise)} Paise Only`;
}
