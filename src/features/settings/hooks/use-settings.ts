import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { CompanyInput, NumberingUpdateInput } from "@/validators/company.schema";
import type { CompanyWithRelations } from "@/repositories/company.repository";
import type { NumberingSequence } from "@/generated/prisma/client";
import type { DocumentType } from "@/generated/prisma/enums";

export function useCompanyProfile() {
  return useQuery({
    queryKey: ["settings-company"],
    queryFn: () => apiFetch<CompanyWithRelations>("/api/settings/company"),
  });
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyInput & { logoUrl?: string; signatureUrl?: string }) =>
      apiFetch<CompanyWithRelations>("/api/settings/company", { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings-company"] }),
  });
}

export function useNumberingSequences() {
  return useQuery({
    queryKey: ["settings-numbering"],
    queryFn: () => apiFetch<NumberingSequence[]>("/api/settings/numbering"),
  });
}

export function useUpdateNumbering() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentType, input }: { documentType: DocumentType; input: NumberingUpdateInput }) =>
      apiFetch<NumberingSequence>(`/api/settings/numbering/${documentType}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings-numbering"] }),
  });
}

export async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => undefined);
    throw new Error(data?.error?.message ?? "Upload failed");
  }
  return res.json();
}
