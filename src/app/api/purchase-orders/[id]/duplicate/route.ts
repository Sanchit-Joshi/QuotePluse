import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { purchaseOrderService } from "@/services/purchase-order/purchase-order.service";

export const POST = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const po = await purchaseOrderService.duplicate(id);
  return NextResponse.json(po, { status: 201 });
});
