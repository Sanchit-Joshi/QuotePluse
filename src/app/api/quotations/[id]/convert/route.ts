import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { quotationService } from "@/services/quotation/quotation.service";
import { invoiceService } from "@/services/invoice/invoice.service";

export const POST = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const { invoiceId } = await quotationService.convertToInvoice(id);
  const invoice = await invoiceService.getOrThrow(invoiceId);
  return NextResponse.json({ invoice }, { status: 201 });
});
