import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { purchaseOrderService } from "@/services/purchase-order/purchase-order.service";
import { purchaseOrderInputSchema } from "@/validators/purchase-order.schema";
import { paginationSchema } from "@/validators/common.schema";
import type { PurchaseOrderStatus } from "@/generated/prisma/enums";

export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  const result = await purchaseOrderService.list({
    page,
    pageSize,
    status: (url.searchParams.get("status") as PurchaseOrderStatus | null) ?? undefined,
    vendorId: url.searchParams.get("vendorId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ? new Date(url.searchParams.get("dateFrom")!) : undefined,
    dateTo: url.searchParams.get("dateTo") ? new Date(url.searchParams.get("dateTo")!) : undefined,
  });
  return NextResponse.json(result);
});

export const POST = withErrorHandling(async (req) => {
  const body = purchaseOrderInputSchema.parse(await req.json());
  const po = await purchaseOrderService.createDraft(body);
  return NextResponse.json(po, { status: 201 });
});
