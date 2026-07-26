import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PageResult } from "@/lib/pagination";
import type { PurchaseOrderDetail, PurchaseOrderListRow } from "@/repositories/purchase-order.repository";
import type { PurchaseOrderInput, PurchaseOrderUpdateInput } from "@/validators/purchase-order.schema";

const KEY = "purchase-orders";

export function usePurchaseOrders(params: {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { search: params.search } : {}),
      });
      return apiFetch<PageResult<PurchaseOrderListRow>>(`/api/purchase-orders?${qs}`);
    },
    placeholderData: (prev) => prev,
  });
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<PurchaseOrderDetail>(`/api/purchase-orders/${id}`),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PurchaseOrderInput) =>
      apiFetch<PurchaseOrderDetail>("/api/purchase-orders", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdatePurchaseOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PurchaseOrderUpdateInput) =>
      apiFetch<PurchaseOrderDetail>(`/api/purchase-orders/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, id] });
    },
  });
}

export function useFinalizePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<PurchaseOrderDetail>(`/api/purchase-orders/${id}/finalize`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDuplicatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<PurchaseOrderDetail>(`/api/purchase-orders/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdatePurchaseOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "CANCELLED" }) =>
      apiFetch<PurchaseOrderDetail>(`/api/purchase-orders/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
