import type { PurchaseOrderInput } from "@/validators/purchase-order.schema";
import type { PurchaseOrderFormValues } from "@/features/purchase-orders/purchase-order-form.schema";
import type { PurchaseOrderDetail } from "@/repositories/purchase-order.repository";

function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/** Converts the client form's plain-string dates into the API's PurchaseOrderInput shape. */
export function toPurchaseOrderInput(values: PurchaseOrderFormValues): PurchaseOrderInput {
  return {
    vendorId: values.vendorId,
    issueDate: new Date(values.issueDate),
    deliveryDate: values.deliveryDate ? new Date(values.deliveryDate) : undefined,
    shippingBy: values.shippingBy,
    shippingTerms: values.shippingTerms,
    deliveryAddress: values.deliveryAddress,
    lineItems: values.lineItems.map((li) => ({
      itemId: li.itemId,
      description: li.description,
      hsnSac: li.hsnSac,
      quantity: li.quantity,
      unitPricePaise: li.unitPricePaise,
      discountPct: li.discountPct,
      gstRate: li.gstRate,
    })),
    documentDiscountPct: values.documentDiscountPct,
    notes: values.notes,
    terms: values.terms,
    paymentTerms: values.paymentTerms,
  };
}

export function purchaseOrderToFormValues(po: PurchaseOrderDetail): PurchaseOrderFormValues {
  return {
    vendorId: po.vendorId,
    issueDate: toDateInputValue(po.issueDate),
    deliveryDate: po.deliveryDate ? toDateInputValue(po.deliveryDate) : undefined,
    shippingBy: po.shippingBy ?? undefined,
    shippingTerms: po.shippingTerms ?? undefined,
    deliveryAddress: po.deliveryAddress ?? undefined,
    lineItems: po.lineItems.map((li) => ({
      itemId: li.itemId ?? undefined,
      description: li.description,
      hsnSac: li.hsnSac ?? undefined,
      quantity: Number(li.quantity),
      unitPricePaise: li.unitPricePaise,
      discountPct: Number(li.discountPct),
      gstRate: Number(li.gstRate),
    })),
    documentDiscountPct: Number(po.documentDiscountPct),
    notes: po.notes ?? undefined,
    terms: po.terms ?? undefined,
    paymentTerms: po.paymentTerms ?? undefined,
  };
}
