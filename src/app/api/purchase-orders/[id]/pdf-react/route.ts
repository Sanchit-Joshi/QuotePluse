import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { reactPdfService } from "@/services/pdf/react-pdf.service";

// @react-pdf/renderer needs the Node.js runtime (uses fontkit/fs), but
// unlike PdfService has no browser to launch, so the default timeout is fine.
export const runtime = "nodejs";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const pdf = await reactPdfService.generatePurchaseOrderPdf(id);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="purchase-order-${id}.pdf"`,
    },
  });
});
