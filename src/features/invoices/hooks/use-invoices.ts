import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PageResult } from "@/lib/pagination";
import type { InvoiceDetail, InvoiceListRow } from "@/repositories/invoice.repository";
import type { DocumentInput, DocumentUpdateInput } from "@/validators/document.schema";

const KEY = "invoices";

export function useInvoices(params: { page: number; pageSize: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { search: params.search } : {}),
      });
      return apiFetch<PageResult<InvoiceListRow>>(`/api/invoices?${qs}`);
    },
    placeholderData: (prev) => prev,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<InvoiceDetail>(`/api/invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentInput) => apiFetch<InvoiceDetail>("/api/invoices", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentUpdateInput) =>
      apiFetch<InvoiceDetail>(`/api/invoices/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, id] });
    },
  });
}

export function useFinalizeInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<InvoiceDetail>(`/api/invoices/${id}/finalize`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDuplicateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<InvoiceDetail>(`/api/invoices/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, paidDate }: { id: string; status: "PENDING" | "PAID" | "CANCELLED"; paidDate?: string }) =>
      apiFetch<InvoiceDetail>(`/api/invoices/${id}/status`, { method: "PATCH", body: { status, paidDate } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useConvertInvoiceToPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vendorId }: { id: string; vendorId: string }) =>
      apiFetch<{ purchaseOrder: { id: string } }>(`/api/invoices/${id}/convert-to-po`, {
        method: "POST",
        body: { vendorId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}
