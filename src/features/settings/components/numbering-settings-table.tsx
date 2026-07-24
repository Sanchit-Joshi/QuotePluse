"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNumberingSequences, useUpdateNumbering } from "@/features/settings/hooks/use-settings";
import type { NumberingResetRule } from "@/generated/prisma/enums";

export function NumberingSettingsTable() {
  const { data, isLoading } = useNumberingSequences();
  const updateMutation = useUpdateNumbering();
  const [drafts, setDrafts] = useState<Record<string, { prefix: string; resetRule: NumberingResetRule }>>({});

  if (isLoading) return <Skeleton className="h-40" />;
  if (!data) return null;

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document type</TableHead>
            <TableHead>Prefix</TableHead>
            <TableHead>Next number</TableHead>
            <TableHead>Reset rule</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((seq) => {
            const draft = drafts[seq.documentType] ?? { prefix: seq.prefix, resetRule: seq.resetRule };
            return (
              <TableRow key={seq.documentType}>
                <TableCell className="font-medium">{seq.documentType}</TableCell>
                <TableCell>
                  <Input
                    className="w-24"
                    value={draft.prefix}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [seq.documentType]: { ...draft, prefix: e.target.value } }))
                    }
                  />
                </TableCell>
                <TableCell>{seq.nextNumber}</TableCell>
                <TableCell>
                  <Select
                    value={draft.resetRule}
                    onValueChange={(v) =>
                      setDrafts((d) => ({
                        ...d,
                        [seq.documentType]: { ...draft, resetRule: v as NumberingResetRule },
                      }))
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEVER">Never reset</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                      <SelectItem value="FINANCIAL_YEAR">Financial year</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={async () => {
                      try {
                        await updateMutation.mutateAsync({
                          documentType: seq.documentType,
                          input: { prefix: draft.prefix, resetRule: draft.resetRule },
                        });
                        toast.success(`${seq.documentType} numbering updated`);
                      } catch {
                        toast.error("Failed to update numbering");
                      }
                    }}
                  >
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
