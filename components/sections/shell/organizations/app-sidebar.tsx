// ################################################################################
// # Check: 12/13/2025                                                            #
// ################################################################################

"use client";

import { useParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { Navbar, NavbarSection, NavbarSpacer } from "@/components/ui/navbar";
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
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Cog6ToothIcon } from "@heroicons/react/20/solid";
// import { InboxIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { getNavConfig, getNavContext, isItemActive } from "@/lib/navigation";
import { useTranslations } from "next-intl";

export function NavbarAppSidebar() {
  return (
    <Navbar>
      <NavbarSpacer />
      <NavbarSection>
        {/* TODO: Implement search functionality
        <NavbarItem href={ROUTES.search} aria-label="Search">
          <MagnifyingGlassIcon />
        </NavbarItem>
        */}
        {/* TODO: Implement inbox functionality
        <NavbarItem href={ROUTES.inbox} aria-label="Inbox">
          <InboxIcon />
        </NavbarItem>
        */}
        <UserButton />
      </NavbarSection>
    </Navbar>
  );
}

export function SidebarAppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations("Navigation.nav");

  const orgSlug = (params.tenant as string) || null;

  const context = getNavContext(pathname, orgSlug);
  const { items, settingsHref } = getNavConfig(context);

  return (
    <Sidebar>
      <SidebarHeader>
        <OrganizationSwitcher
          afterSelectOrganizationUrl="/:slug"
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger: "w-full justify-between",
            },
          }}
        />
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          {items.map((item) => {
            const href = item.href(orgSlug ?? undefined);
            const isCurrent = isItemActive(pathname, href, item.isIndex);

            return (
              <SidebarItem key={item.labelKey} href={href} current={isCurrent}>
                <item.icon data-slot="icon" />
                <SidebarLabel>{t(item.labelKey)}</SidebarLabel>
              </SidebarItem>
            );
          })}
        </SidebarSection>

        <SidebarSpacer />

        <SidebarSection>
          <SidebarItem
            href={settingsHref(orgSlug ?? undefined)}
            current={isItemActive(
              pathname,
              settingsHref(orgSlug ?? undefined),
              false,
            )}
          >
            <Cog6ToothIcon data-slot="icon" />
            <SidebarLabel>{t("settings")}</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter className="max-lg:hidden">
        <UserButton
          appearance={{
            elements: {
              userButtonBox: {
                flexDirection: "row-reverse",
                textAlign: "left",
                maxWidth: "95%",
              },
            },
          }}
          showName
        />
      </SidebarFooter>
    </Sidebar>
  );
}
