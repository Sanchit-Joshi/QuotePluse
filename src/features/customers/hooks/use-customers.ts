import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PageResult } from "@/lib/pagination";
import type { Customer } from "@/generated/prisma/client";
import type { CustomerInput, CustomerUpdateInput } from "@/validators/customer.schema";

const KEY = "customers";

export function useCustomers(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        ...(params.search ? { search: params.search } : {}),
      });
      return apiFetch<PageResult<Customer>>(`/api/customers?${qs}`);
    },
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<Customer>(`/api/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) => apiFetch<Customer>("/api/customers", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerUpdateInput) =>
      apiFetch<Customer>(`/api/customers/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useArchiveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
