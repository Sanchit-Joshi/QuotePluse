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
import { PurchaseOrderForm } from "@/features/purchase-orders/components/purchase-order-form";
import { purchaseOrderToFormValues } from "@/features/purchase-orders/purchase-order-mappers";
import {
  useDuplicatePurchaseOrder,
  useFinalizePurchaseOrder,
  usePurchaseOrder,
  useUpdatePurchaseOrder,
  useUpdatePurchaseOrderStatus,
} from "@/features/purchase-orders/hooks/use-purchase-orders";

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: po, isLoading, isError, refetch } = usePurchaseOrder(id);
  const updateMutation = useUpdatePurchaseOrder(id);
  const duplicateMutation = useDuplicatePurchaseOrder();
  const statusMutation = useUpdatePurchaseOrderStatus();
  const finalizeMutation = useFinalizePurchaseOrder();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !po) return <ErrorState onRetry={() => refetch()} />;

  const canCancel = po.status === "DRAFT" || po.status === "SENT";

  return (
    <div>
      <PageHeader
        title={po.number ?? "Draft purchase order"}
        description={po.vendor.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={po.status} />
            <LinkButton href={`/purchase-orders/${id}/preview`} variant="outline">
              <Eye className="size-4" /> Preview
            </LinkButton>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a href={`/api/purchase-orders/${id}/pdf`} target="_blank" rel="noreferrer">
                  <Download className="size-4" /> Download PDF
                </a>
              }
            />
            <Button
              variant="outline"
              onClick={async () => {
                const dup = await duplicateMutation.mutateAsync(id);
                toast.success("Purchase order duplicated");
                router.push(`/purchase-orders/${dup.id}`);
              }}
            >
              <Copy className="size-4" /> Duplicate
            </Button>
            {canCancel ? (
              <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
                Cancel
              </Button>
            ) : null}
          </div>
        }
      />

      <PurchaseOrderForm
        documentId={id}
        initialValues={purchaseOrderToFormValues(po)}
        onCreate={async () => {
          throw new Error("Already created");
        }}
        onUpdate={(docId, payload) => updateMutation.mutateAsync(payload).then(() => ({ id: docId }))}
        onFinalize={(docId) => finalizeMutation.mutateAsync(docId).then(() => undefined)}
        showFinalize={po.status === "DRAFT"}
      />

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this purchase order?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The purchase order number (if sent) stays reserved but the document is
              marked cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await statusMutation.mutateAsync({ id, status: "CANCELLED" });
                toast.success("Purchase order cancelled");
              }}
            >
              Cancel purchase order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
