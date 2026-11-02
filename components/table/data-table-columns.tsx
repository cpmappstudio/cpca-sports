"use client";

import type { Table } from "@tanstack/react-table";
import { Check, Columns3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DataTableColumnsProps<TData> {
  table: Table<TData>;
  label?: string;
  labels?: Record<string, string>;
  groups?: Record<string, string>;
  className?: string;
}

export function DataTableColumns<TData>({
  table,
  label,
  labels,
  groups,
  className,
}: DataTableColumnsProps<TData>) {
  const t = useTranslations("Common.table");
  const grouped = new Map<string, ReturnType<typeof table.getAllColumns>>();
  for (const column of table.getAllColumns()) {
    if (!column.getCanHide()) continue;
    const group = groups?.[column.id] ?? "";
    const columns = grouped.get(group) ?? [];
    columns.push(column);
    grouped.set(group, columns);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={label ?? t("columns")}
          className={className}
        >
          <Columns3 className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <Command label={label ?? t("columns")}>
          <CommandInput
            placeholder={t("searchColumns")}
            aria-label={t("searchColumns")}
          />
          <CommandList className="max-h-80">
            <CommandEmpty>{t("noResults")}</CommandEmpty>
            {[...grouped].map(([group, columns]) => (
              <CommandGroup key={group} heading={group || undefined}>
                {columns.map((column) => {
                  const name = labels?.[column.id] ?? column.id;
                  const visible = column.getIsVisible();
                  return (
                    <CommandItem
                      key={column.id}
                      value={column.id}
                      keywords={[name, group]}
                      aria-label={t(visible ? "hideColumn" : "showColumn", {
                        column: name,
                      })}
                      onSelect={() => column.toggleVisibility(!visible)}
                      className="cursor-pointer gap-3 py-2"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                          visible
                            ? "border-primary bg-primary"
                            : "border-input",
                        )}
                      >
                        {visible ? (
                          <Check className="size-3 text-primary-foreground" />
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 whitespace-normal break-words",
                          !labels && "capitalize",
                        )}
                      >
                        {name}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
