import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { itemService } from "@/services/item/item.service";
import { itemInputSchema } from "@/validators/item.schema";
import { paginationSchema } from "@/validators/common.schema";

export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const search = url.searchParams.get("search") ?? undefined;

  const result = await itemService.list({ page, pageSize, search });
  return NextResponse.json(result);
});

export const POST = withErrorHandling(async (req) => {
  const body = itemInputSchema.parse(await req.json());
  const item = await itemService.create(body);
  return NextResponse.json(item, { status: 201 });
});
