"use client";

import { useWatch, type Control } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateTotals } from "@/services/totals/totals-calculator";
import { formatPaiseAsCurrency } from "@/lib/money";
import type { PurchaseOrderFormValues } from "@/features/purchase-orders/purchase-order-form.schema";

/** Same as features/documents/components/totals-preview.tsx, retyped for PurchaseOrderFormValues. */
export function PurchaseOrderTotalsPreview({
  control,
  companyState,
  vendorState,
}: {
  control: Control<PurchaseOrderFormValues>;
  companyState: string;
  vendorState: string | undefined;
}) {
  const lineItems = useWatch({ control, name: "lineItems" });
  const documentDiscountPct = useWatch({ control, name: "documentDiscountPct" });

  const totals = calculateTotals({
    lineItems: (lineItems ?? []).map((li) => ({
      quantity: Number(li.quantity) || 0,
      unitPricePaise: Number(li.unitPricePaise) || 0,
      discountPct: Number(li.discountPct) || 0,
      gstRate: Number(li.gstRate) || 0,
    })),
    documentDiscountPct: Number(documentDiscountPct) || 0,
    companyState,
    customerState: vendorState ?? companyState,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Totals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <Row label="Subtotal" value={totals.subtotalPaise} />
        <Row label="Discount" value={-totals.discountPaise} />
        <Row label="Taxable value" value={totals.taxableValuePaise} />
        {totals.cgstPaise > 0 && <Row label="CGST" value={totals.cgstPaise} />}
        {totals.sgstPaise > 0 && <Row label="SGST" value={totals.sgstPaise} />}
        {totals.igstPaise > 0 && <Row label="IGST" value={totals.igstPaise} />}
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total Amount</span>
          <span>{formatPaiseAsCurrency(totals.grandTotalPaise)}</span>
        </div>
        <p className="pt-1 text-xs italic text-muted-foreground">{totals.amountInWords}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{formatPaiseAsCurrency(value)}</span>
    </div>
  );
}
