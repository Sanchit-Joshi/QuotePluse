"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { apiFetch } from "@/lib/api-client";
import type { PageResult } from "@/lib/pagination";
import type { Item } from "@/generated/prisma/client";

export function ItemCombobox({ onSelectItem }: { onSelectItem: (item: Item) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["items-combobox", search],
    queryFn: () =>
      apiFetch<PageResult<Item>>(
        `/api/items?page=1&pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      ),
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="justify-between font-normal">
            <span className="text-muted-foreground">Add from catalog...</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search products..." value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <CommandEmpty>No products found.</CommandEmpty>
                <CommandGroup>
                  {data?.items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        onSelectItem(item);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check className="size-4 opacity-0" />
                      <div>
                        <div>{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.unit} · ₹{(item.defaultUnitPricePaise / 100).toFixed(2)}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
