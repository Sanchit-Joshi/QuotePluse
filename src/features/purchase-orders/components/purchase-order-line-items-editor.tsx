"use client";

import { Controller, useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ItemCombobox } from "@/features/documents/components/item-combobox";
import type { PurchaseOrderFormValues } from "@/features/purchase-orders/purchase-order-form.schema";
import type { Item } from "@/generated/prisma/client";

/** Same as features/documents/components/line-items-editor.tsx, retyped for PurchaseOrderFormValues — see purchase-order-form.schema.ts for why this isn't shared directly. */
export function PurchaseOrderLineItemsEditor({
  control,
  register,
}: {
  control: Control<PurchaseOrderFormValues>;
  register: UseFormRegister<PurchaseOrderFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  function addFromCatalog(item: Item) {
    append({
      itemId: item.id,
      description: item.name,
      hsnSac: item.hsnSac ?? "",
      quantity: 1,
      unitPricePaise: item.defaultUnitPricePaise,
      discountPct: 0,
      gstRate: Number(item.defaultGstRate),
    });
  }

  function addBlank() {
    append({ description: "", hsnSac: "", quantity: 1, unitPricePaise: 0, discountPct: 0, gstRate: 18 });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Line items</h3>
        <div className="flex gap-2">
          <ItemCombobox onSelectItem={addFromCatalog} />
          <Button type="button" variant="outline" size="sm" onClick={addBlank}>
            <Plus className="size-4" /> Add line
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          No line items yet. Add one from the catalog or as a blank line.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Description</TableHead>
                <TableHead className="w-24">HSN/SAC</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="w-32">Basic price (₹)</TableHead>
                <TableHead className="w-24">Disc %</TableHead>
                <TableHead className="w-24">GST %</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Input {...register(`lineItems.${index}.description`)} aria-label="Description" />
                  </TableCell>
                  <TableCell>
                    <Input {...register(`lineItems.${index}.hsnSac`)} aria-label="HSN or SAC code" />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                      aria-label="Quantity"
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={control}
                      name={`lineItems.${index}.unitPricePaise`}
                      render={({ field: { value, onChange, onBlur, ref } }) => (
                        <Input
                          type="number"
                          step="0.01"
                          ref={ref}
                          onBlur={onBlur}
                          value={value / 100}
                          onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))}
                          aria-label="Basic price"
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lineItems.${index}.discountPct`, { valueAsNumber: true })}
                      aria-label="Discount percent"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lineItems.${index}.gstRate`, { valueAsNumber: true })}
                      aria-label="GST rate"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove line item"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
