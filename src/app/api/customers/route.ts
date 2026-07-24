import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { customerService } from "@/services/customer/customer.service";
import { customerInputSchema } from "@/validators/customer.schema";
import { paginationSchema } from "@/validators/common.schema";

export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const search = url.searchParams.get("search") ?? undefined;

  const result = await customerService.list({ page, pageSize, search });
  return NextResponse.json(result);
});

export const POST = withErrorHandling(async (req) => {
  const body = customerInputSchema.parse(await req.json());
  const customer = await customerService.create(body);
  return NextResponse.json(customer, { status: 201 });
});
