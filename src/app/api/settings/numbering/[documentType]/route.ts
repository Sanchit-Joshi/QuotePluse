import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { companyService } from "@/services/company/company.service";
import { numberingUpdateSchema } from "@/validators/company.schema";
import { ValidationError } from "@/lib/errors";
import { DocumentType } from "@/generated/prisma/enums";

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { documentType } = await params;
  if (!Object.values(DocumentType).includes(documentType as DocumentType)) {
    throw new ValidationError("Invalid document type", { documentType: "Must be QUOTATION or INVOICE" });
  }
  const body = numberingUpdateSchema.parse(await req.json());
  const sequence = await companyService.updateNumbering(documentType as DocumentType, body);
  return NextResponse.json(sequence);
});
