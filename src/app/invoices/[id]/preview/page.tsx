import { notFound } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import { mapInvoiceToPdfData } from "@/services/pdf/document-pdf-mapper";
import { DocumentTemplate } from "@/templates/document-pdf/DocumentTemplate";
import { PreviewToolbar } from "@/features/documents/components/preview-toolbar";
import type { DocumentPdfData } from "@/templates/document-pdf/types";

export default async function InvoicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data: DocumentPdfData;
  try {
    ({ data } = await mapInvoiceToPdfData(id));
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PreviewToolbar pdfHref={`/api/invoices/${id}/pdf`} />
      <div className="rounded-md border bg-white shadow-sm print:border-0 print:shadow-none">
        <DocumentTemplate data={data} />
      </div>
    </div>
  );
}
