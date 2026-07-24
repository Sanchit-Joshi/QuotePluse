import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { quotationService } from "@/services/quotation/quotation.service";
import { documentUpdateSchema } from "@/validators/document.schema";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const quotation = await quotationService.getOrThrow(id);
  return NextResponse.json(quotation);
});

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const body = documentUpdateSchema.parse(await req.json());
  const quotation = await quotationService.update(id, body);
  return NextResponse.json(quotation);
});
