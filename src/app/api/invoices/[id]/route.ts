import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { invoiceService } from "@/services/invoice/invoice.service";
import { documentUpdateSchema } from "@/validators/document.schema";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const invoice = await invoiceService.getOrThrow(id);
  return NextResponse.json(invoice);
});

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const body = documentUpdateSchema.parse(await req.json());
  const invoice = await invoiceService.update(id, body);
  return NextResponse.json(invoice);
});
