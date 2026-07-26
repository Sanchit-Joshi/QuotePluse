import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { purchaseOrderService } from "@/services/purchase-order/purchase-order.service";
import { purchaseOrderUpdateSchema } from "@/validators/purchase-order.schema";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const po = await purchaseOrderService.getOrThrow(id);
  return NextResponse.json(po);
});

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const body = purchaseOrderUpdateSchema.parse(await req.json());
  const po = await purchaseOrderService.update(id, body);
  return NextResponse.json(po);
});
