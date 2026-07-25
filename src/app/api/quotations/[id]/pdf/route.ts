import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { pdfService } from "@/services/pdf/pdf.service";

// Playwright/Chromium needs the Node.js runtime (not Edge) and can exceed
// Vercel's default 10s function timeout, especially on a cold start.
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  // TEMP diagnostic (see docs/decision-log.md ADR-015) — surfaces the raw
  // error instead of the generic wrapper message, to debug a production-only
  // PDF generation failure. Remove once diagnosed.
  if (new URL(req.url).searchParams.get("debug") === "1") {
    try {
      const pdf = await pdfService.generateQuotationPdf(id);
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      });
    } catch (err) {
      return NextResponse.json(
        {
          debugError: err instanceof Error ? err.message : String(err),
          debugStack: err instanceof Error ? err.stack : undefined,
        },
        { status: 500 },
      );
    }
  }
  const pdf = await pdfService.generateQuotationPdf(id);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="quotation-${id}.pdf"`,
    },
  });
});
