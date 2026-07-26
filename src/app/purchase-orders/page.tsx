"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { LinkButton } from "@/components/shared/link-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePurchaseOrders } from "@/features/purchase-orders/hooks/use-purchase-orders";
import { formatPaiseAsCurrency } from "@/lib/money";

const PAGE_SIZE = 20;

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");

  const { data, isLoading, isError, refetch } = usePurchaseOrders({
    page,
    pageSize: PAGE_SIZE,
    search,
    status: status === "ALL" ? undefined : status,
  });

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Create and track purchase orders sent to vendors."
        actions={
          <LinkButton href="/purchase-orders/new">
            <Plus className="size-4" /> New purchase order
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by number or vendor..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
          aria-label="Search purchase orders"
        />
        <Select value={status} onValueChange={(v) => { if (v) setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No purchase orders yet"
          description="Create your first purchase order to send to a vendor."
          action={
            <LinkButton href="/purchase-orders/new">
              <Plus className="size-4" /> New purchase order
            </LinkButton>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((po) => (
                  <TableRow key={po.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/purchase-orders/${po.id}`} className="font-medium hover:underline">
                        {po.number ?? "Draft"}
                      </Link>
                    </TableCell>
                    <TableCell>{po.vendor.name}</TableCell>
                    <TableCell>{new Date(po.issueDate).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>{formatPaiseAsCurrency(po.grandTotalPaise)}</TableCell>
                    <TableCell>
                      <StatusBadge status={po.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
