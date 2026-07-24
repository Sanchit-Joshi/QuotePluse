import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { companyService } from "@/services/company/company.service";
import { companyInputSchema } from "@/validators/company.schema";

export const GET = withErrorHandling(async () => {
  const company = await companyService.getProfile();
  return NextResponse.json(company);
});

export const PATCH = withErrorHandling(async (req) => {
  const body = await req.json();
  const parsed = companyInputSchema.parse(body);
  const company = await companyService.updateProfile({
    ...parsed,
    logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : undefined,
    signatureUrl: typeof body.signatureUrl === "string" ? body.signatureUrl : undefined,
  });
  return NextResponse.json(company);
});
