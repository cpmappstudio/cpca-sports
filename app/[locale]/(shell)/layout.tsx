import { SidebarAppSidebar, NavbarAppSidebar } from "@/components/app-sidebar";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout
      fullWidth
      navbar={<NavbarAppSidebar />}
      sidebar={<SidebarAppSidebar />}
    >
      <main className="flex-1">{children}</main>
    </SidebarLayout>
  );
}
