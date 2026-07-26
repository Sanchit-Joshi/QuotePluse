"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { VendorCombobox } from "@/features/purchase-orders/components/vendor-combobox";

/**
 * Shared by the quotation and invoice detail pages' "Convert to PO" action.
 * Unlike quotation-to-invoice conversion (no extra input needed — same
 * customer), a PO's counterparty is a Vendor the source document has no
 * reference to at all, so the user must pick one here before converting.
 */
export function ConvertToPurchaseOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (vendorId: string) => void;
  pending: boolean;
}) {
  const [vendorId, setVendorId] = useState<string | undefined>(undefined);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setVendorId(undefined);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to purchase order</DialogTitle>
          <DialogDescription>
            Creates a new draft purchase order with these line items (description, HSN/SAC, quantity, GST
            rate). Pricing is left blank for you to fill in from the vendor&apos;s actual quote — the
            customer-facing price has no bearing on vendor cost.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label className="mb-2 block">Vendor</Label>
          <VendorCombobox value={vendorId} onChange={setVendorId} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!vendorId || pending} onClick={() => vendorId && onConfirm(vendorId)}>
            {pending ? "Converting..." : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
