import {
  SidebarAppSidebar,
  NavbarAppSidebar,
} from "@/components/sections/shell/organizations/app-sidebar";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";
import { SportProvider } from "@/lib/sports";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  // TODO: When Convex is connected, fetch sportType from league data
  // const league = await fetchLeague(tenant);
  // const sportType = league.sportType;
  const sportType = "basketball" as const;

  return (
    <SportProvider sportType={sportType}>
      <SidebarLayout
        fullWidth
        navbar={<NavbarAppSidebar />}
        sidebar={<SidebarAppSidebar />}
      >
        <main className="flex-1">{children}</main>
      </SidebarLayout>
    </SportProvider>
  );
}
