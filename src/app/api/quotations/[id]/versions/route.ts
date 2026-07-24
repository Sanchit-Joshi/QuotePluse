import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { quotationService } from "@/services/quotation/quotation.service";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const versions = await quotationService.versions(id);
  return NextResponse.json(versions);
});
