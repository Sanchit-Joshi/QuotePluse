import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { invoiceService } from "@/services/invoice/invoice.service";

export const POST = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const invoice = await invoiceService.duplicate(id);
  return NextResponse.json(invoice, { status: 201 });
});
