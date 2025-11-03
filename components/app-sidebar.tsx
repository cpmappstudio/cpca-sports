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
import {
  OrganizationSwitcher,
  UserButton,
  useUser,
  useOrganization,
  useAuth,
} from "@clerk/nextjs";
import {
  HomeIcon,
  InboxIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import { usePathname } from "next/navigation";
import { UserButtonSkeleton } from "./skeletons/user-button-skeleton";
import { OrganizationSwitcherSkeleton } from "./skeletons/organization-switcher-skeleton";
import {
  buildNavUrl,
  getNavigationContext,
  isNavItemActive,
} from "@/lib/navigation/navigation";

export default function AppSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isOrganizationLoaded, organization } = useOrganization();
  const { has } = useAuth();
  let pathname = usePathname();

  const orgSlug = organization?.slug;
  const { role, navItems } =
    has && orgSlug
      ? getNavigationContext(orgSlug, has)
      : { role: null, navItems: [] };
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
            {!isOrganizationLoaded ? (
              <OrganizationSwitcherSkeleton />
            ) : (
              <OrganizationSwitcher afterSelectOrganizationUrl="/:slug" />
            )}
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              {role &&
                orgSlug &&
                navItems.map((item) => {
                  const href = buildNavUrl(orgSlug, role, item.href);
                  const isCurrent = isNavItemActive(
                    pathname,
                    href,
                    item.href === "",
                  );

                  return (
                    <SidebarItem
                      key={item.label}
                      href={href}
                      current={isCurrent}
                    >
                      <item.icon />
                      <SidebarLabel>{item.label}</SidebarLabel>
                    </SidebarItem>
                  );
                })}
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
            {!isUserLoaded ? (
              <UserButtonSkeleton />
            ) : (
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
            )}
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
