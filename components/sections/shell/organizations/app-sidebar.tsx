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
import { getNavConfig, getNavContext, isItemActive } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/navigation/routes";
import { useSportTerminology } from "@/lib/sports";
import type { SportTerminology } from "@/lib/sports";

const TERMINOLOGY_MAP: Record<string, keyof SportTerminology> = {
  teams: "clubs",
  // divisions: "divisions",
  tournaments: "tournaments",
};

export function NavbarAppSidebar() {
  return (
    <Navbar>
      <NavbarSpacer />
      <NavbarSection>
        <UserButton />
      </NavbarSection>
    </Navbar>
  );
}

export function SidebarAppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations("Navigation.nav");
  const terminology = useSportTerminology();

  const orgSlug = (params.tenant as string) || null;

  const context = getNavContext(pathname, orgSlug);
  // This sidebar only handles admin and org contexts, team has its own sidebar
  const navContext = context === "team" ? "org" : context;
  const { items, settingsHref } = getNavConfig(navContext);

  const getLabel = (labelKey: string): string => {
    const terminologyKey = TERMINOLOGY_MAP[labelKey];
    if (terminologyKey && context === "org") {
      return terminology[terminologyKey];
    }
    return t(labelKey);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <OrganizationSwitcher
          afterLeaveOrganizationUrl={ROUTES.admin.organizations.list}
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
                <SidebarLabel>{getLabel(item.labelKey)}</SidebarLabel>
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
