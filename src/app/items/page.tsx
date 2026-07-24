"use client";

import { useState } from "react";
import { MoreHorizontal, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { useArchiveItem, useItems } from "@/features/items/hooks/use-items";
import { ItemFormDialog } from "@/features/items/components/item-form-dialog";
import { formatPaiseAsCurrency } from "@/lib/money";
import type { Item } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export default function ItemsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | undefined>(undefined);
  const [archiving, setArchiving] = useState<Item | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useItems({ page, pageSize: PAGE_SIZE, search });
  const archiveMutation = useArchiveItem();

  return (
    <div>
      <PageHeader
        title="Products"
        description="Reusable catalog items for quotation and invoice line items."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> New product
          </Button>
        }
      />

      <Input
        placeholder="Search by name or HSN/SAC..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="mb-4 max-w-sm"
        aria-label="Search products"
      />

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add a product to reuse it across quotations and invoices."
          action={
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> New product
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>HSN/SAC</TableHead>
                  <TableHead>Default price</TableHead>
                  <TableHead>GST %</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.hsnSac ?? "—"}</TableCell>
                    <TableCell>{formatPaiseAsCurrency(item.defaultUnitPricePaise)}</TableCell>
                    <TableCell>{String(item.defaultGstRate)}%</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${item.name}`}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(item);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setArchiving(item)}>
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

      <ItemFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />

      <AlertDialog open={!!archiving} onOpenChange={(open) => !open && setArchiving(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archiving?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived products no longer appear when adding new line items, but existing documents are
              unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!archiving) return;
                try {
                  await archiveMutation.mutateAsync(archiving.id);
                  toast.success("Product archived");
                } catch {
                  toast.error("Failed to archive product");
                } finally {
                  setArchiving(undefined);
                }
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
