"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { Category } from "@/generated/prisma/client";

/**
 * Searchable category picker that also lets the user create a brand new
 * category inline (typing a name with no exact match shows a "Create
 * <name>" option) — used on the product form so the catalog's categories
 * grow organically instead of needing a separate admin screen.
 */
export function CategoryCombobox({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/api/categories"),
  });

  const selected = categories?.find((c) => c.id === value);
  const trimmedSearch = search.trim();
  const hasExactMatch = categories?.some((c) => c.name.toLowerCase() === trimmedSearch.toLowerCase());

  async function handleCreate() {
    if (!trimmedSearch) return;
    setCreating(true);
    try {
      const created = await apiFetch<Category>("/api/categories", {
        method: "POST",
        body: { name: trimmedSearch },
      });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      onChange(created.id);
      setSearch("");
      setOpen(false);
      toast.success(`Category "${created.name}" created`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn(!selected && "text-muted-foreground")}>
              {selected ? selected.name : "Select a category..."}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or create category..." value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <CommandEmpty>No categories found.</CommandEmpty>
                <CommandGroup>
                  {categories
                    ?.filter((c) => c.name.toLowerCase().includes(trimmedSearch.toLowerCase()))
                    .map((category) => (
                      <CommandItem
                        key={category.id}
                        value={category.id}
                        onSelect={() => {
                          onChange(category.id);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("size-4", value === category.id ? "opacity-100" : "opacity-0")} />
                        {category.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
                {trimmedSearch && !hasExactMatch ? (
                  <CommandGroup>
                    <CommandItem value={`__create__${trimmedSearch}`} onSelect={handleCreate} disabled={creating}>
                      <Plus className="size-4" />
                      {creating ? "Creating..." : `Create category "${trimmedSearch}"`}
                    </CommandItem>
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
