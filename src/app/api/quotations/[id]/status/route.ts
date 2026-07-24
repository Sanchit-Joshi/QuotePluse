import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { quotationService } from "@/services/quotation/quotation.service";
import { quotationStatusUpdateSchema } from "@/validators/document.schema";

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const { status } = quotationStatusUpdateSchema.parse(await req.json());
  const quotation = await quotationService.updateStatus(id, status);
  return NextResponse.json(quotation);
});
