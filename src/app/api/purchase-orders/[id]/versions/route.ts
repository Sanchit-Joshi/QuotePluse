import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { purchaseOrderService } from "@/services/purchase-order/purchase-order.service";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const versions = await purchaseOrderService.versions(id);
  return NextResponse.json(versions);
});
