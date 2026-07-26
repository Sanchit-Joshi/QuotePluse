import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PageResult } from "@/lib/pagination";
import type { Vendor } from "@/generated/prisma/client";
import type { VendorInput, VendorUpdateInput } from "@/validators/vendor.schema";

const KEY = "vendors";

export function useVendors(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        ...(params.search ? { search: params.search } : {}),
      });
      return apiFetch<PageResult<Vendor>>(`/api/vendors?${qs}`);
    },
    placeholderData: (prev) => prev,
  });
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<Vendor>(`/api/vendors/${id}`),
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VendorInput) => apiFetch<Vendor>("/api/vendors", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateVendor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VendorUpdateInput) =>
      apiFetch<Vendor>(`/api/vendors/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useArchiveVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
