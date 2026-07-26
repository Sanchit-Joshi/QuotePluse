"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Download, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/shared/link-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentForm } from "@/features/documents/components/document-form";
import { quotationToFormValues } from "@/features/documents/document-mappers";
import { ConvertToPurchaseOrderDialog } from "@/features/purchase-orders/components/convert-to-po-dialog";
import {
  useConvertQuotationToInvoice,
  useConvertQuotationToPurchaseOrder,
  useDuplicateQuotation,
  useFinalizeQuotation,
  useQuotation,
  useUpdateQuotation,
  useUpdateQuotationStatus,
} from "@/features/quotations/hooks/use-quotations";

export default function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: quotation, isLoading, isError, refetch } = useQuotation(id);
  const updateMutation = useUpdateQuotation(id);
  const duplicateMutation = useDuplicateQuotation();
  const convertMutation = useConvertQuotationToInvoice();
  const convertToPoMutation = useConvertQuotationToPurchaseOrder();
  const statusMutation = useUpdateQuotationStatus();
  const finalizeMutation = useFinalizeQuotation();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [convertToPoOpen, setConvertToPoOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !quotation) return <ErrorState onRetry={() => refetch()} />;

  const canApprove = quotation.status === "SENT";
  const canCancel = quotation.status === "SENT" || quotation.status === "APPROVED";
  const canConvert = quotation.status === "SENT" || quotation.status === "APPROVED";
  const canConvertToPo = quotation.status !== "DRAFT" && !quotation.convertedToPurchaseOrderId;

  return (
    <div>
      <PageHeader
        title={quotation.number ?? "Draft quotation"}
        description={quotation.customer.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={quotation.status} />
            <LinkButton href={`/quotations/${id}/preview`} variant="outline">
              <Eye className="size-4" /> Preview
            </LinkButton>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a href={`/api/quotations/${id}/pdf`} target="_blank" rel="noreferrer">
                  <Download className="size-4" /> Download PDF
                </a>
              }
            />
            <Button
              variant="outline"
              onClick={async () => {
                const dup = await duplicateMutation.mutateAsync(id);
                toast.success("Quotation duplicated");
                router.push(`/quotations/${dup.id}`);
              }}
            >
              <Copy className="size-4" /> Duplicate
            </Button>
            {canApprove ? (
              <Button
                onClick={async () => {
                  await statusMutation.mutateAsync({ id, status: "APPROVED" });
                  toast.success("Quotation approved");
                }}
              >
                Mark approved
              </Button>
            ) : null}
            {canConvert ? (
              <Button onClick={() => setConfirmConvert(true)}>Convert to invoice</Button>
            ) : null}
            {canConvertToPo ? (
              <Button variant="outline" onClick={() => setConvertToPoOpen(true)}>
                Convert to PO
              </Button>
            ) : null}
            {canCancel ? (
              <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
                Cancel
              </Button>
            ) : null}
          </div>
        }
      />

      <DocumentForm
        mode="quotation"
        documentId={id}
        initialValues={quotationToFormValues(quotation)}
        redirectBasePath="/quotations"
        onCreate={async () => {
          throw new Error("Already created");
        }}
        onUpdate={(docId, payload) => updateMutation.mutateAsync(payload).then(() => ({ id: docId }))}
        onFinalize={(docId) => finalizeMutation.mutateAsync(docId).then(() => undefined)}
        showFinalize={quotation.status === "DRAFT"}
      />

      <ConvertToPurchaseOrderDialog
        open={convertToPoOpen}
        onOpenChange={setConvertToPoOpen}
        pending={convertToPoMutation.isPending}
        onConfirm={async (vendorId) => {
          const result = await convertToPoMutation.mutateAsync({ id, vendorId });
          toast.success("Purchase order created");
          setConvertToPoOpen(false);
          router.push(`/purchase-orders/${result.purchaseOrder.id}`);
        }}
      />

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The quotation number stays reserved but the document is marked cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await statusMutation.mutateAsync({ id, status: "CANCELLED" });
                toast.success("Quotation cancelled");
              }}
            >
              Cancel quotation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmConvert} onOpenChange={setConfirmConvert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Creates a new draft invoice with the same customer and line items. This quotation will be marked
              as converted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const result = await convertMutation.mutateAsync(id);
                toast.success("Invoice created");
                router.push(`/invoices/${result.invoice.id}`);
              }}
            >
              Convert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
