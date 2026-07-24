import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { companyService } from "@/services/company/company.service";

export const GET = withErrorHandling(async () => {
  const sequences = await companyService.listNumbering();
  return NextResponse.json(sequences);
});
