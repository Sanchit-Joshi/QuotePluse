import { notFound } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import { mapPurchaseOrderToPdfData } from "@/services/pdf/purchase-order-pdf-mapper";
import { PurchaseOrderTemplate } from "@/templates/purchase-order-pdf/PurchaseOrderTemplate";
import { PreviewToolbar } from "@/features/documents/components/preview-toolbar";
import type { PurchaseOrderPdfData } from "@/templates/purchase-order-pdf/types";

export default async function PurchaseOrderPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data: PurchaseOrderPdfData;
  try {
    ({ data } = await mapPurchaseOrderToPdfData(id));
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Vercel-only stand-in: /pdf-react (no browser/Chromium cold start).
          Flip back to `/api/purchase-orders/${id}/pdf` (Playwright, true
          WYSIWYG) once a non-serverless server is available — see decision-log.md. */}
      <PreviewToolbar pdfHref={`/api/purchase-orders/${id}/pdf-react`} />
      <div className="rounded-md border bg-white shadow-sm print:border-0 print:shadow-none">
        <PurchaseOrderTemplate data={data} />
      </div>
    </div>
  );
}
