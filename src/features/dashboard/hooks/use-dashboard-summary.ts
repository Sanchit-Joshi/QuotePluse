import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface DashboardRecentDoc {
  type: "QUOTATION" | "INVOICE";
  id: string;
  number: string | null;
  status: string;
  grandTotalPaise: number;
  updatedAt: string;
  customer: { name: string };
}

export interface DashboardSummary {
  counts: Record<string, number>;
  amounts: Record<string, number>;
  recent: DashboardRecentDoc[];
}

export function useDashboardSummary(period: "month" | "quarter") {
  return useQuery({
    queryKey: ["dashboard-summary", period],
    queryFn: () => apiFetch<DashboardSummary>(`/api/dashboard/summary?period=${period}`),
  });
}
