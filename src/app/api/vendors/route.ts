import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { vendorService } from "@/services/vendor/vendor.service";
import { vendorInputSchema } from "@/validators/vendor.schema";
import { paginationSchema } from "@/validators/common.schema";

export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const search = url.searchParams.get("search") ?? undefined;

  const result = await vendorService.list({ page, pageSize, search });
  return NextResponse.json(result);
});

export const POST = withErrorHandling(async (req) => {
  const body = vendorInputSchema.parse(await req.json());
  const vendor = await vendorService.create(body);
  return NextResponse.json(vendor, { status: 201 });
});
