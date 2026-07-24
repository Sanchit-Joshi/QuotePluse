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
import { CustomerCombobox } from "@/features/documents/components/customer-combobox";
import { LineItemsEditor } from "@/features/documents/components/line-items-editor";
import { TotalsPreview } from "@/features/documents/components/totals-preview";
import { documentFormSchema, type DocumentFormValues } from "@/features/documents/document-form.schema";
import { toDocumentInput } from "@/features/documents/document-mappers";
import { useCompanyProfile } from "@/features/settings/hooks/use-settings";
import { useCustomer } from "@/features/customers/hooks/use-customers";
import { ApiError } from "@/lib/api-client";
import type { DocumentInput } from "@/validators/document.schema";
import type { Customer } from "@/generated/prisma/client";

const EMPTY_VALUES: DocumentFormValues = {
  customerId: "",
  issueDate: new Date().toISOString().slice(0, 10),
  secondaryDate: undefined,
  lineItems: [],
  documentDiscountPct: 0,
  notes: "",
  terms: "",
};

export function DocumentForm({
  mode,
  documentId,
  initialValues,
  onCreate,
  onUpdate,
  onFinalize,
  redirectBasePath,
  showFinalize = true,
}: {
  mode: "quotation" | "invoice";
  documentId?: string;
  initialValues?: DocumentFormValues;
  onCreate: (payload: DocumentInput) => Promise<{ id: string }>;
  onUpdate: (id: string, payload: DocumentInput) => Promise<{ id: string }>;
  onFinalize: (id: string) => Promise<void>;
  redirectBasePath: string;
  /** Hide the finalize action once a document has already left DRAFT (FR-3.3/FR-4.2). */
  showFinalize?: boolean;
}) {
  const router = useRouter();
  const { data: company } = useCompanyProfile();
  const [savedId, setSavedId] = useState(documentId);
  const [customerState, setCustomerState] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: initialValues ?? EMPTY_VALUES,
  });

  // Seed the totals preview's customer state when editing an existing
  // document — the combobox only reports state on a fresh selection, so
  // without this the preview would default to companyState until the user
  // re-picks the customer, even though the server-persisted totals are
  // already correct (see initialValues.customerId).
  const { data: initialCustomer } = useCustomer(customerState ? undefined : initialValues?.customerId);
  useEffect(() => {
    if (initialCustomer) setCustomerState(initialCustomer.state);
  }, [initialCustomer]);

  function handleCustomerSelected(customer: Customer) {
    setCustomerState(customer.state);
  }

  async function saveDraft(values: DocumentFormValues): Promise<string> {
    const payload = toDocumentInput(values, mode);
    if (savedId) {
      await onUpdate(savedId, payload);
      return savedId;
    }
    const created = await onCreate(payload);
    setSavedId(created.id);
    return created.id;
  }

  async function handleSaveDraft(values: DocumentFormValues) {
    setSaving(true);
    try {
      const id = await saveDraft(values);
      toast.success("Draft saved");
      if (!documentId) {
        router.replace(`${redirectBasePath}/${id}`);
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
      toast.success(mode === "quotation" ? "Quotation sent" : "Invoice finalized");
      router.push(`${redirectBasePath}/${id}`);
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
            <CardTitle className="text-base">Customer & dates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Customer</Label>
              <CustomerCombobox
                value={form.watch("customerId")}
                onChange={(id) => form.setValue("customerId", id, { shouldValidate: true })}
                onSelectCustomer={handleCustomerSelected}
              />
              {form.formState.errors.customerId ? (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.customerId.message}</p>
              ) : null}
            </div>
            <div>
              <Label className="mb-2 block">Issue date</Label>
              <Input type="date" {...form.register("issueDate")} />
            </div>
            <div>
              <Label className="mb-2 block">{mode === "quotation" ? "Valid until" : "Due date"}</Label>
              <Input type="date" {...form.register("secondaryDate")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <LineItemsEditor control={form.control} register={form.register} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes & terms</CardTitle>
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
            <div />
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
        <TotalsPreview
          control={form.control}
          companyState={company?.state ?? ""}
          customerState={customerState}
        />
        <div className="flex flex-col gap-2">
          <Button type="submit" variant="outline" disabled={saving || finalizing}>
            {saving ? "Saving..." : "Save draft"}
          </Button>
          {showFinalize ? (
            <Button type="button" onClick={handleFinalize} disabled={saving || finalizing}>
              {finalizing ? "Finalizing..." : mode === "quotation" ? "Save & send" : "Save & finalize"}
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
