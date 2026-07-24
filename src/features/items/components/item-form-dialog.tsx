"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { itemInputSchema, type ItemInput } from "@/validators/item.schema";
import { useCreateItem, useUpdateItem } from "@/features/items/hooks/use-items";
import type { Item } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api-client";

export function ItemFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
}) {
  const isEdit = !!item;
  const form = useForm<ItemInput>({
    resolver: zodResolver(itemInputSchema),
    defaultValues: {
      name: "",
      description: "",
      hsnSac: "",
      unit: "",
      defaultUnitPricePaise: 0,
      defaultGstRate: 18,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: item?.name ?? "",
        description: item?.description ?? "",
        hsnSac: item?.hsnSac ?? "",
        unit: item?.unit ?? "",
        defaultUnitPricePaise: item?.defaultUnitPricePaise ?? 0,
        defaultGstRate: item ? Number(item.defaultGstRate) : 18,
      });
    }
  }, [open, item, form]);

  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem(item?.id ?? "");
  const pending = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: ItemInput) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(values);
      } else {
        await createMutation.mutateAsync(values);
      }
      toast.success(isEdit ? "Product updated" : "Product created");
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        for (const [field, message] of Object.entries(err.fields)) {
          form.setError(field as keyof ItemInput, { message });
        }
      }
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            Reusable catalog item — defaults are copied onto new line items and can be edited per document.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="pcs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hsnSac"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSN/SAC (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultGstRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="defaultUnitPricePaise"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default unit price (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value / 100}
                      onChange={(e) => field.onChange(Math.round(Number(e.target.value) * 100))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
