import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PageResult } from "@/lib/pagination";
import type { Item } from "@/generated/prisma/client";
import type { ItemInput, ItemUpdateInput } from "@/validators/item.schema";

const KEY = "items";

export type ItemWithCategory = Item & { category: { id: string; name: string } | null };

export function useItems(params: { page: number; pageSize: number; search?: string; categoryId?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        ...(params.search ? { search: params.search } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      });
      return apiFetch<PageResult<ItemWithCategory>>(`/api/items?${qs}`);
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ItemInput) => apiFetch<Item>("/api/items", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ItemUpdateInput) => apiFetch<Item>(`/api/items/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useArchiveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/items/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
