"use client";

import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  Navbar,
  NavbarItem,
  NavbarSection,
  NavbarSpacer,
} from "@/components/ui/navbar";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from "@/components/ui/sidebar";
import { SidebarLayout } from "@/components/ui/sidebar-layout";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  HomeIcon,
  InboxIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import { usePathname } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default function AppSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  let pathname = usePathname();
  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <NavbarItem href="/search" aria-label="Search">
              <MagnifyingGlassIcon />
            </NavbarItem>
            <NavbarItem href="/inbox" aria-label="Inbox">
              <InboxIcon />
            </NavbarItem>
            <UserButton />
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <OrganizationSwitcher afterSelectOrganizationUrl="/:slug" />
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/" current={pathname === "/"}>
                <HomeIcon />
                <SidebarLabel>Home</SidebarLabel>
              </SidebarItem>
              {/*<SidebarItem
                href="/events"
                current={pathname.startsWith("/events")}
              >
                <Square2StackIcon />
                <SidebarLabel>Events</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                href="/orders"
                current={pathname.startsWith("/orders")}
              >
                <TicketIcon />
                <SidebarLabel>Orders</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                href="/settings"
                current={pathname.startsWith("/settings")}
              >
                <Cog6ToothIcon />
                <SidebarLabel>Settings</SidebarLabel>
              </SidebarItem>*/}
            </SidebarSection>
            <SidebarSpacer />
            <SidebarSection>
              <SidebarItem>
                <ModeToggle />
                {/*<SidebarLabel>Support</SidebarLabel>*/}
              </SidebarItem>
              {/*<SidebarItem href="/support">
                <QuestionMarkCircleIcon />
                <SidebarLabel>Support</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/changelog">
                <SparklesIcon />
                <SidebarLabel>Changelog</SidebarLabel>
              </SidebarItem>*/}
            </SidebarSection>
          </SidebarBody>
          <SidebarFooter className="max-lg:hidden">
            <UserButton
              appearance={{
                elements: {
                  userButtonBox: {
                    flexDirection: "row-reverse",
                    textAlign: "left",
                    width: "100%",
                  },
                },
              }}
              showName
            />
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
