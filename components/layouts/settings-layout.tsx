"use client";

import React from "react";
import clsx from "clsx";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSearch } from "@/components/sections/shell/settings/settings-search";

export interface SettingsNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsLayoutProps {
  children: React.ReactNode;
  navItems: SettingsNavItem[];
  basePath: string;
}

function SettingsSidebar({
  navItems,
  basePath,
}: {
  navItems: SettingsNavItem[];
  basePath: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-y-1 pr-6">
      <div className="mb-4">
        <SettingsSearch basePath={basePath} />
      </div>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SettingsNavSelect({ navItems }: { navItems: SettingsNavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentItem = navItems.find((item) => item.href === pathname);

  return (
    <div className="mb-6 border-b border-zinc-200 pb-4 dark:border-zinc-700">
      <Select
        value={currentItem?.href ?? navItems[0]?.href}
        onValueChange={(value: string) => router.push(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select page" />
        </SelectTrigger>
        <SelectContent>
          {navItems.map((item) => (
            <SelectItem key={item.href} value={item.href}>
              <div className="flex items-center gap-2">
                <item.icon className="size-4" />
                {item.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SettingsLayout({
  children,
  navItems,
  basePath,
}: SettingsLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Mobile: Select navigation */}
      <div className="lg:hidden">
        <SettingsNavSelect navItems={navItems} />
      </div>

      {/* Desktop: Sidebar + Content */}
      <div className="flex flex-1 gap-8">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <SettingsSidebar navItems={navItems} basePath={basePath} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
