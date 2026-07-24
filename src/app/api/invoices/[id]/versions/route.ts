import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { invoiceService } from "@/services/invoice/invoice.service";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const versions = await invoiceService.versions(id);
  return NextResponse.json(versions);
});
