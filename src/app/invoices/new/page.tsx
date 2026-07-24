"use client";

import { PageHeader } from "@/components/shared/page-header";
import { DocumentForm } from "@/features/documents/components/document-form";
import { useCreateInvoice, useFinalizeInvoice } from "@/features/invoices/hooks/use-invoices";

export default function NewInvoicePage() {
  const createMutation = useCreateInvoice();
  const finalizeMutation = useFinalizeInvoice();

  return (
    <div>
      <PageHeader title="New invoice" description="Fill in the details to create an invoice." />
      <DocumentForm
        mode="invoice"
        redirectBasePath="/invoices"
        onCreate={(payload) => createMutation.mutateAsync(payload)}
        onUpdate={async () => {
          throw new Error("Not applicable for new documents");
        }}
        onFinalize={(id) => finalizeMutation.mutateAsync(id).then(() => undefined)}
      />
    </div>
  );
}
