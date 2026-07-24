import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { pdfService } from "@/services/pdf/pdf.service";

// Playwright/Chromium needs the Node.js runtime (not Edge) and can exceed
// Vercel's default 10s function timeout, especially on a cold start.
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const pdf = await pdfService.generateQuotationPdf(id);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="quotation-${id}.pdf"`,
    },
  });
});
