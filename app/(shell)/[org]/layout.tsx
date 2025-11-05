import { SidebarAppSidebar, NavbarAppSidebar } from "@/components/app-sidebar";
import { SidebarLayout } from "@/components/ui/sidebar-layout";
import { Protect } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout
      navbar={<NavbarAppSidebar />}
      sidebar={<SidebarAppSidebar />}
    >
      <main className="flex-1">{children}</main>
    </SidebarLayout>
  );
}
