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
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type { PageResult } from "@/lib/pagination";
import type { Customer } from "@/generated/prisma/client";

export function CustomerCombobox({
  value,
  onChange,
  onSelectCustomer,
}: {
  value: string | undefined;
  onChange: (id: string) => void;
  onSelectCustomer?: (customer: Customer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["customers-combobox", search],
    queryFn: () =>
      apiFetch<PageResult<Customer>>(
        `/api/customers?page=1&pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      ),
    enabled: open,
  });

  const { data: selected } = useQuery({
    queryKey: ["customer", value],
    queryFn: () => apiFetch<Customer>(`/api/customers/${value}`),
    enabled: !!value,
  });

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
              {selected ? selected.name : "Select a customer..."}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search customers..." value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <CommandEmpty>No customers found.</CommandEmpty>
                <CommandGroup>
                  {data?.items.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => {
                        onChange(customer.id);
                        onSelectCustomer?.(customer);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("size-4", value === customer.id ? "opacity-100" : "opacity-0")} />
                      <div>
                        <div>{customer.name}</div>
                        <div className="text-xs text-muted-foreground">{customer.state}</div>
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
