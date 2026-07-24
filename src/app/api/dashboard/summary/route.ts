import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { dashboardService } from "@/services/dashboard/dashboard.service";

export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") === "quarter" ? "quarter" : "month";
  const summary = await dashboardService.summary(period);
  return NextResponse.json(summary);
});
