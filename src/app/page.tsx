"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { formatPaiseAsCurrency } from "@/lib/money";

const STATUS_ORDER = ["DRAFT", "SENT", "PENDING", "APPROVED", "PAID", "CANCELLED", "CONVERTED"];

export default function DashboardPage() {
  const [period, setPeriod] = useState<"month" | "quarter">("month");
  const { data, isLoading, isError, refetch } = useDashboardSummary(period);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your quotations and invoices."
        actions={
          <Tabs value={period} onValueChange={(v) => setPeriod(v as "month" | "quarter")}>
            <TabsList>
              <TabsTrigger value="month">This month</TabsTrigger>
              <TabsTrigger value="quarter">This quarter</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {STATUS_ORDER.filter((s) => data && data.counts[s]).map((status) => (
              <Card key={status}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{status}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{data!.counts[status] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPaiseAsCurrency(data!.amounts[status] ?? 0)}
                  </p>
                </CardContent>
              </Card>
            ))}
            {data && Object.keys(data.counts).length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={LayoutDashboard}
                  title="No activity yet"
                  description="Create your first quotation to see it summarized here."
                />
              </div>
            ) : null}
          </div>

          <h2 className="mb-3 text-lg font-medium">Recent documents</h2>
          {!data || data.recent.length === 0 ? (
            <EmptyState icon={FileText} title="Nothing here yet" />
          ) : (
            <div className="divide-y rounded-md border">
              {data.recent.map((doc) => (
                <Link
                  key={`${doc.type}-${doc.id}`}
                  href={doc.type === "QUOTATION" ? `/quotations/${doc.id}` : `/invoices/${doc.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{doc.number ?? "Draft"}</p>
                    <p className="text-sm text-muted-foreground">{doc.customer.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatPaiseAsCurrency(doc.grandTotalPaise)}</span>
                    <StatusBadge status={doc.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
