import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { quotationService } from "@/services/quotation/quotation.service";

export const POST = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const quotation = await quotationService.finalize(id);
  return NextResponse.json(quotation);
});
