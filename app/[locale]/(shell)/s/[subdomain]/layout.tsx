// ################################################################################
// # Check: 12/13/2025                                                            #
// ################################################################################

import {
  SidebarAppSidebar,
  NavbarAppSidebar,
} from "@/components/sections/shell/organizations/app-sidebar";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
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
