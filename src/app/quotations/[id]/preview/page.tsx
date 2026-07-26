import { notFound } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import { mapQuotationToPdfData } from "@/services/pdf/document-pdf-mapper";
import { DocumentTemplate } from "@/templates/document-pdf/DocumentTemplate";
import { PreviewToolbar } from "@/features/documents/components/preview-toolbar";
import type { DocumentPdfData } from "@/templates/document-pdf/types";

export default async function QuotationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data: DocumentPdfData;
  try {
    ({ data } = await mapQuotationToPdfData(id));
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Vercel-only stand-in: /pdf-react (no browser/Chromium cold start).
          Flip back to `/api/quotations/${id}/pdf` (Playwright, true WYSIWYG)
          once a non-serverless server is available — see decision-log.md. */}
      <PreviewToolbar pdfHref={`/api/quotations/${id}/pdf-react`} />
      <div className="rounded-md border bg-white shadow-sm print:border-0 print:shadow-none">
        <DocumentTemplate data={data} />
      </div>
    </div>
  );
}
