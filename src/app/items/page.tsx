"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useArchiveItem, useItems, type ItemWithCategory } from "@/features/items/hooks/use-items";
import { ItemFormDialog } from "@/features/items/components/item-form-dialog";
import { formatPaiseAsCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api-client";
import type { Category } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export default function ItemsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItemWithCategory | undefined>(undefined);
  const [archiving, setArchiving] = useState<ItemWithCategory | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useItems({ page, pageSize: PAGE_SIZE, search, categoryId });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/api/categories"),
  });
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

      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Search by name or HSN/SAC..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
          aria-label="Search products"
        />
        <Select
          value={categoryId ?? "all"}
          onValueChange={(value) => {
            setCategoryId(value === "all" ? undefined : (value as string));
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by category" className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                  <TableHead>Category</TableHead>
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
                    <TableCell>{item.category?.name ?? "—"}</TableCell>
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
