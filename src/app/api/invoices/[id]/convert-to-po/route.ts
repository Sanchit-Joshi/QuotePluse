import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { invoiceService } from "@/services/invoice/invoice.service";
import { purchaseOrderService } from "@/services/purchase-order/purchase-order.service";
import { convertToPurchaseOrderSchema } from "@/validators/purchase-order.schema";

export const POST = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const { vendorId } = convertToPurchaseOrderSchema.parse(await req.json());
  const { purchaseOrderId } = await invoiceService.convertToPurchaseOrder(id, vendorId);
  const purchaseOrder = await purchaseOrderService.getOrThrow(purchaseOrderId);
  return NextResponse.json({ purchaseOrder }, { status: 201 });
});
