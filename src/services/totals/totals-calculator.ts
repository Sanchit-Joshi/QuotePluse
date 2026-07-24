import { paiseToAmountInWords } from "@/lib/money";

export interface TotalsLineItemInput {
  quantity: number;
  unitPricePaise: number;
  discountPct: number;
  gstRate: number;
}

export interface TotalsInput {
  lineItems: TotalsLineItemInput[];
  documentDiscountPct?: number;
  companyState: string;
  customerState: string;
}

export interface LineItemComputed extends TotalsLineItemInput {
  lineTotalPaise: number;
}

export interface TotalsResult {
  lineItems: LineItemComputed[];
  subtotalPaise: number;
  discountPaise: number;
  taxableValuePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  roundingPaise: number;
  grandTotalPaise: number;
  amountInWords: string;
}

function round(n: number): number {
  return Math.round(n);
}

/**
 * Pure GST totals engine (FR-5). Mirrors the client's actual reference
 * invoices (see docs/decision-log.md ADR-009): `Amount = Qty * Rate` per
 * line, then GST is computed once on the *taxable value*, not accumulated
 * line-by-line — e.g. their sheet is literally `=SUBTOTAL*9%` for CGST and
 * again for SGST, not a sum of per-line roundings. We generalize this to
 * support mixed GST rates within one document (their real invoices only
 * ever use a single rate) by grouping lines by rate and taxing each group's
 * taxable value once; with a single uniform rate across all lines this is
 * arithmetically identical to their formula. There is deliberately no
 * "round to nearest rupee" step — their invoices show exact rupee.paise
 * amounts, never a Round Off line.
 *
 * All arithmetic happens in integer paise; the only place a fractional
 * value briefly appears is an intermediate percentage multiplication,
 * immediately rounded back to whole paise.
 *
 * Intra-state (company.state === customer.state) splits GST into CGST+SGST
 * (half each); inter-state charges the full rate as IGST.
 */
export function calculateTotals(input: TotalsInput): TotalsResult {
  const isIntraState =
    input.companyState.trim().toLowerCase() === input.customerState.trim().toLowerCase();
  const documentDiscountPct = input.documentDiscountPct ?? 0;

  let subtotalPaise = 0;
  let lineDiscountPaise = 0;

  const lineItems: LineItemComputed[] = input.lineItems.map((line) => {
    const grossPaise = round(line.quantity * line.unitPricePaise);
    const lineDiscount = round((grossPaise * line.discountPct) / 100);
    const lineTotalPaise = grossPaise - lineDiscount;

    subtotalPaise += grossPaise;
    lineDiscountPaise += lineDiscount;

    return { ...line, lineTotalPaise };
  });

  const documentDiscountPaise = round(
    ((subtotalPaise - lineDiscountPaise) * documentDiscountPct) / 100,
  );
  const discountPaise = lineDiscountPaise + documentDiscountPaise;
  const taxableValuePaise = subtotalPaise - discountPaise;

  // Apportion the document-level discount across lines proportionally, then
  // group by GST rate so tax is computed once per rate group on that
  // group's total taxable value — not summed from N per-line roundings.
  const preDiscountTaxable = subtotalPaise - lineDiscountPaise || 1;
  const taxableByRate = new Map<number, number>();

  for (const line of lineItems) {
    const lineShareOfDocDiscount = round(
      (line.lineTotalPaise / preDiscountTaxable) * documentDiscountPaise,
    );
    const lineTaxable = line.lineTotalPaise - lineShareOfDocDiscount;
    taxableByRate.set(line.gstRate, (taxableByRate.get(line.gstRate) ?? 0) + lineTaxable);
  }

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  for (const [rate, groupTaxable] of taxableByRate) {
    const groupGst = round((groupTaxable * rate) / 100);
    if (isIntraState) {
      const half = round(groupGst / 2);
      cgstPaise += half;
      sgstPaise += groupGst - half;
    } else {
      igstPaise += groupGst;
    }
  }

  const grandTotalPaise = taxableValuePaise + cgstPaise + sgstPaise + igstPaise;

  return {
    lineItems,
    subtotalPaise,
    discountPaise,
    taxableValuePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    roundingPaise: 0,
    grandTotalPaise,
    amountInWords: paiseToAmountInWords(grandTotalPaise),
  };
}
