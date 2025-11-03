"use client";

import AppSidebar from "@/components/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSidebar>
      <main className="flex-1">{children}</main>
    </AppSidebar>
  );
}
