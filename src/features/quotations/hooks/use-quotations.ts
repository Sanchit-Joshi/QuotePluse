import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PageResult } from "@/lib/pagination";
import type { QuotationDetail, QuotationListRow } from "@/repositories/quotation.repository";
import type { DocumentInput, DocumentUpdateInput } from "@/validators/document.schema";

const KEY = "quotations";

export function useQuotations(params: {
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
      return apiFetch<PageResult<QuotationListRow>>(`/api/quotations?${qs}`);
    },
    placeholderData: (prev) => prev,
  });
}

export function useQuotation(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<QuotationDetail>(`/api/quotations/${id}`),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentInput) =>
      apiFetch<QuotationDetail>("/api/quotations", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateQuotation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentUpdateInput) =>
      apiFetch<QuotationDetail>(`/api/quotations/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, id] });
    },
  });
}

export function useFinalizeQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<QuotationDetail>(`/api/quotations/${id}/finalize`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDuplicateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<QuotationDetail>(`/api/quotations/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateQuotationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "CANCELLED" }) =>
      apiFetch<QuotationDetail>(`/api/quotations/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useConvertQuotationToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ invoice: { id: string } }>(`/api/quotations/${id}/convert`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useConvertQuotationToPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vendorId }: { id: string; vendorId: string }) =>
      apiFetch<{ purchaseOrder: { id: string } }>(`/api/quotations/${id}/convert-to-po`, {
        method: "POST",
        body: { vendorId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}
