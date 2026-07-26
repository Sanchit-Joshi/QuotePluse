"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VendorCombobox } from "@/features/purchase-orders/components/vendor-combobox";
import { PurchaseOrderLineItemsEditor } from "@/features/purchase-orders/components/purchase-order-line-items-editor";
import { PurchaseOrderTotalsPreview } from "@/features/purchase-orders/components/purchase-order-totals-preview";
import {
  purchaseOrderFormSchema,
  type PurchaseOrderFormValues,
} from "@/features/purchase-orders/purchase-order-form.schema";
import { toPurchaseOrderInput } from "@/features/purchase-orders/purchase-order-mappers";
import { useCompanyProfile } from "@/features/settings/hooks/use-settings";
import { useVendor } from "@/features/vendors/hooks/use-vendors";
import { ApiError } from "@/lib/api-client";
import type { PurchaseOrderInput } from "@/validators/purchase-order.schema";
import type { Vendor } from "@/generated/prisma/client";

const EMPTY_VALUES: PurchaseOrderFormValues = {
  vendorId: "",
  issueDate: new Date().toISOString().slice(0, 10),
  deliveryDate: undefined,
  shippingBy: "",
  shippingTerms: "",
  deliveryAddress: "",
  lineItems: [],
  documentDiscountPct: 0,
  notes: "",
  terms: "",
  paymentTerms: "",
};

/** Purchase-order equivalent of features/documents/components/document-form.tsx — vendor instead of customer, plus shipping/delivery/payment fields quotations/invoices don't have. */
export function PurchaseOrderForm({
  documentId,
  initialValues,
  onCreate,
  onUpdate,
  onFinalize,
  showFinalize = true,
}: {
  documentId?: string;
  initialValues?: PurchaseOrderFormValues;
  onCreate: (payload: PurchaseOrderInput) => Promise<{ id: string }>;
  onUpdate: (id: string, payload: PurchaseOrderInput) => Promise<{ id: string }>;
  onFinalize: (id: string) => Promise<void>;
  showFinalize?: boolean;
}) {
  const router = useRouter();
  const { data: company } = useCompanyProfile();
  const [savedId, setSavedId] = useState(documentId);
  const [vendorState, setVendorState] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: initialValues ?? EMPTY_VALUES,
  });

  // Same rationale as DocumentForm: seed the totals preview's vendor state
  // when editing an existing PO, since the combobox only reports state on a
  // fresh selection.
  const { data: initialVendor } = useVendor(vendorState ? undefined : initialValues?.vendorId);
  useEffect(() => {
    if (initialVendor) setVendorState(initialVendor.state);
  }, [initialVendor]);

  function handleVendorSelected(vendor: Vendor) {
    setVendorState(vendor.state);
  }

  async function saveDraft(values: PurchaseOrderFormValues): Promise<string> {
    const payload = toPurchaseOrderInput(values);
    if (savedId) {
      await onUpdate(savedId, payload);
      return savedId;
    }
    const created = await onCreate(payload);
    setSavedId(created.id);
    return created.id;
  }

  async function handleSaveDraft(values: PurchaseOrderFormValues) {
    setSaving(true);
    try {
      const id = await saveDraft(values);
      toast.success("Draft saved");
      if (!documentId) {
        router.replace(`/purchase-orders/${id}`);
      }
    } catch (err) {
      applyServerErrors(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    const values = form.getValues();
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Fix the highlighted fields before finalizing");
      return;
    }
    if (values.lineItems.length === 0) {
      toast.error("Add at least one line item before finalizing");
      return;
    }
    setFinalizing(true);
    try {
      const id = await saveDraft(values);
      await onFinalize(id);
      toast.success("Purchase order sent");
      router.push(`/purchase-orders/${id}`);
    } catch (err) {
      applyServerErrors(err);
    } finally {
      setFinalizing(false);
    }
  }

  function applyServerErrors(err: unknown) {
    if (err instanceof ApiError && err.fields) {
      for (const [field, message] of Object.entries(err.fields)) {
        if (field === "lineItems" || field === "_") {
          toast.error(message);
        }
      }
    }
    toast.error(err instanceof Error ? err.message : "Something went wrong");
  }

  return (
    <form onSubmit={form.handleSubmit(handleSaveDraft)} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendor & dates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Vendor</Label>
              <VendorCombobox
                value={form.watch("vendorId")}
                onChange={(id) => form.setValue("vendorId", id, { shouldValidate: true })}
                onSelectVendor={handleVendorSelected}
              />
              {form.formState.errors.vendorId ? (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.vendorId.message}</p>
              ) : null}
            </div>
            <div>
              <Label className="mb-2 block">Issue date</Label>
              <Input type="date" {...form.register("issueDate")} />
            </div>
            <div>
              <Label className="mb-2 block">Delivery date</Label>
              <Input type="date" {...form.register("deliveryDate")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping & delivery</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">Shipping by</Label>
              <Input {...form.register("shippingBy")} placeholder="e.g. Road" />
            </div>
            <div>
              <Label className="mb-2 block">Shipping terms</Label>
              <Input {...form.register("shippingTerms")} placeholder="e.g. Free" />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Delivery address</Label>
              <Textarea {...form.register("deliveryAddress")} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <PurchaseOrderLineItemsEditor control={form.control} register={form.register} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes, terms & payment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">Document discount %</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("documentDiscountPct", { valueAsNumber: true })}
                className="max-w-32"
              />
            </div>
            <div>
              <Label className="mb-2 block">Payment terms</Label>
              <Input {...form.register("paymentTerms")} placeholder="e.g. As per credit policy" />
            </div>
            <div>
              <Label className="mb-2 block">Notes</Label>
              <Textarea {...form.register("notes")} rows={3} />
            </div>
            <div>
              <Label className="mb-2 block">Terms &amp; conditions</Label>
              <Textarea {...form.register("terms")} rows={3} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <PurchaseOrderTotalsPreview
          control={form.control}
          companyState={company?.state ?? ""}
          vendorState={vendorState}
        />
        <div className="flex flex-col gap-2">
          <Button type="submit" variant="outline" disabled={saving || finalizing}>
            {saving ? "Saving..." : "Save draft"}
          </Button>
          {showFinalize ? (
            <Button type="button" onClick={handleFinalize} disabled={saving || finalizing}>
              {finalizing ? "Finalizing..." : "Save & send"}
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
