"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
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
import { useQuotations } from "@/features/quotations/hooks/use-quotations";
import { formatPaiseAsCurrency } from "@/lib/money";

const PAGE_SIZE = 20;

export default function QuotationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");

  const { data, isLoading, isError, refetch } = useQuotations({
    page,
    pageSize: PAGE_SIZE,
    search,
    status: status === "ALL" ? undefined : status,
  });

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Create and track quotations sent to customers."
        actions={
          <LinkButton href="/quotations/new">
            <Plus className="size-4" /> New quotation
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by number or customer..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
          aria-label="Search quotations"
        />
        <Select value={status} onValueChange={(v) => { if (v) setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotations yet"
          description="Create your first quotation to send to a customer."
          action={
            <LinkButton href="/quotations/new">
              <Plus className="size-4" /> New quotation
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/quotations/${q.id}`} className="font-medium hover:underline">
                        {q.number ?? "Draft"}
                      </Link>
                    </TableCell>
                    <TableCell>{q.customer.name}</TableCell>
                    <TableCell>{new Date(q.issueDate).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>{formatPaiseAsCurrency(q.grandTotalPaise)}</TableCell>
                    <TableCell>
                      <StatusBadge status={q.status} />
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
