import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { invoiceService } from "@/services/invoice/invoice.service";
import { invoiceStatusUpdateSchema } from "@/validators/document.schema";

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const { status, paidDate } = invoiceStatusUpdateSchema.parse(await req.json());
  const invoice = await invoiceService.updateStatus(id, status, paidDate);
  return NextResponse.json(invoice);
});
