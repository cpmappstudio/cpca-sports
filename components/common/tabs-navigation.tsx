import type { ComponentType } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabItem = {
  value: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  count?: number;
};

export function TabsNavigation({ items }: { items: TabItem[] }) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <TabsList>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="gap-1 px-2 text-xs md:px-3 md:text-sm"
            >
              {Icon ? <Icon className="hidden h-4 w-4 md:block" /> : null}
              <span>{item.label}</span>
              {item.count !== undefined ? (
                <span className="text-muted-foreground">({item.count})</span>
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
