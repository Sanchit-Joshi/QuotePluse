"use client";

import { PageHeader } from "@/components/shared/page-header";
import { DocumentForm } from "@/features/documents/components/document-form";
import { useCreateQuotation, useFinalizeQuotation } from "@/features/quotations/hooks/use-quotations";

export default function NewQuotationPage() {
  const createMutation = useCreateQuotation();
  const finalizeMutation = useFinalizeQuotation();

  return (
    <div>
      <PageHeader title="New quotation" description="Fill in the details to create a quotation." />
      <DocumentForm
        mode="quotation"
        redirectBasePath="/quotations"
        onCreate={(payload) => createMutation.mutateAsync(payload)}
        onUpdate={async () => {
          throw new Error("Not applicable for new documents");
        }}
        onFinalize={(id) => finalizeMutation.mutateAsync(id).then(() => undefined)}
      />
    </div>
  );
}
