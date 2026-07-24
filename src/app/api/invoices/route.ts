import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { invoiceService } from "@/services/invoice/invoice.service";
import { documentInputSchema } from "@/validators/document.schema";
import { paginationSchema } from "@/validators/common.schema";
import type { InvoiceStatus } from "@/generated/prisma/enums";

export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  const result = await invoiceService.list({
    page,
    pageSize,
    status: (url.searchParams.get("status") as InvoiceStatus | null) ?? undefined,
    customerId: url.searchParams.get("customerId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ? new Date(url.searchParams.get("dateFrom")!) : undefined,
    dateTo: url.searchParams.get("dateTo") ? new Date(url.searchParams.get("dateTo")!) : undefined,
  });
  return NextResponse.json(result);
});

export const POST = withErrorHandling(async (req) => {
  const body = documentInputSchema.parse(await req.json());
  const invoice = await invoiceService.createDraft(body);
  return NextResponse.json(invoice, { status: 201 });
});
