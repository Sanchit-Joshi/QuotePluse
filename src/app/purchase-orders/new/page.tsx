"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PurchaseOrderForm } from "@/features/purchase-orders/components/purchase-order-form";
import {
  useCreatePurchaseOrder,
  useFinalizePurchaseOrder,
} from "@/features/purchase-orders/hooks/use-purchase-orders";

export default function NewPurchaseOrderPage() {
  const createMutation = useCreatePurchaseOrder();
  const finalizeMutation = useFinalizePurchaseOrder();

  return (
    <div>
      <PageHeader title="New purchase order" description="Fill in the details to create a purchase order." />
      <PurchaseOrderForm
        onCreate={(payload) => createMutation.mutateAsync(payload)}
        onUpdate={async () => {
          throw new Error("Not applicable for new documents");
        }}
        onFinalize={(id) => finalizeMutation.mutateAsync(id).then(() => undefined)}
      />
    </div>
  );
}
