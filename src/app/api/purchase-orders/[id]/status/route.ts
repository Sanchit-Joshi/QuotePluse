import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { purchaseOrderService } from "@/services/purchase-order/purchase-order.service";
import { purchaseOrderStatusUpdateSchema } from "@/validators/purchase-order.schema";

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const { status } = purchaseOrderStatusUpdateSchema.parse(await req.json());
  const po = await purchaseOrderService.updateStatus(id, status);
  return NextResponse.json(po);
});
