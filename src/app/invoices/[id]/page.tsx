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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentForm } from "@/features/documents/components/document-form";
import { invoiceToFormValues } from "@/features/documents/document-mappers";
import { ConvertToPurchaseOrderDialog } from "@/features/purchase-orders/components/convert-to-po-dialog";
import {
  useConvertInvoiceToPurchaseOrder,
  useDuplicateInvoice,
  useFinalizeInvoice,
  useInvoice,
  useUpdateInvoice,
  useUpdateInvoiceStatus,
} from "@/features/invoices/hooks/use-invoices";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: invoice, isLoading, isError, refetch } = useInvoice(id);
  const updateMutation = useUpdateInvoice(id);
  const duplicateMutation = useDuplicateInvoice();
  const statusMutation = useUpdateInvoiceStatus();
  const finalizeMutation = useFinalizeInvoice();
  const convertToPoMutation = useConvertInvoiceToPurchaseOrder();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [convertToPoOpen, setConvertToPoOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !invoice) return <ErrorState onRetry={() => refetch()} />;

  const canMarkPaid = invoice.status === "PENDING";
  const canCancel = invoice.status === "PENDING" || invoice.status === "DRAFT";
  const canConvertToPo = invoice.status !== "CANCELLED" && !invoice.convertedToPurchaseOrderId;

  return (
    <div>
      <PageHeader
        title={invoice.number ?? "Draft invoice"}
        description={invoice.customer.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={invoice.status} />
            <LinkButton href={`/invoices/${id}/preview`} variant="outline">
              <Eye className="size-4" /> Preview
            </LinkButton>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noreferrer">
                  <Download className="size-4" /> Download PDF
                </a>
              }
            />
            <Button
              variant="outline"
              onClick={async () => {
                const dup = await duplicateMutation.mutateAsync(id);
                toast.success("Invoice duplicated");
                router.push(`/invoices/${dup.id}`);
              }}
            >
              <Copy className="size-4" /> Duplicate
            </Button>
            {canMarkPaid ? <Button onClick={() => setPayDialogOpen(true)}>Mark paid</Button> : null}
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
        mode="invoice"
        documentId={id}
        initialValues={invoiceToFormValues(invoice)}
        redirectBasePath="/invoices"
        onCreate={async () => {
          throw new Error("Already created");
        }}
        onUpdate={(docId, payload) => updateMutation.mutateAsync(payload).then(() => ({ id: docId }))}
        onFinalize={(docId) => finalizeMutation.mutateAsync(docId).then(() => undefined)}
        showFinalize={invoice.status === "DRAFT"}
      />

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark invoice as paid</DialogTitle>
            <DialogDescription>Record the date payment was received.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="mb-2 block">Paid date</Label>
            <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await statusMutation.mutateAsync({ id, status: "PAID", paidDate });
                toast.success("Invoice marked paid");
                setPayDialogOpen(false);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogTitle>Cancel this invoice?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await statusMutation.mutateAsync({ id, status: "CANCELLED" });
                toast.success("Invoice cancelled");
              }}
            >
              Cancel invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
