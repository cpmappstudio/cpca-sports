"use client";

import { useParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
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
import { UserButton } from "@clerk/nextjs";
import {
  InboxIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
} from "@heroicons/react/20/solid";
import {
  getNavConfig,
  buildNavHref,
  isItemActive,
  type NavContext,
} from "@/lib/navigation";
import { ROUTE_SEGMENTS } from "@/lib/routes";
import { useTranslations } from "next-intl";

function getNavContext(
  pathname: string,
  leagueSlug: string | null,
  clubSlug: string | null,
): NavContext {
  if (pathname.startsWith("/admin")) {
    return "admin";
  }
  if (clubSlug) {
    return "club";
  }
  if (leagueSlug) {
    return "league";
  }
  return "admin";
}

function getBasePath(
  context: NavContext,
  leagueSlug: string | null,
  clubSlug: string | null,
): string {
  switch (context) {
    case "admin":
      return "/admin";
    case "club":
      return `/${leagueSlug}/${clubSlug}`;
    case "league":
      return `/${leagueSlug}`;
    default:
      return "";
  }
}

export function NavbarAppSidebar() {
  return (
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
  );
}

export function SidebarAppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations("Navigation.nav");

  const leagueSlug = (params.league as string) || null;
  const clubSlug = (params.club as string) || null;

  const context = getNavContext(pathname, leagueSlug, clubSlug);
  const basePath = getBasePath(context, leagueSlug, clubSlug);
  const { items, showSettings } = getNavConfig(context);

  return (
    <Sidebar>
      <SidebarHeader />

      <SidebarBody>
        <SidebarSection>
          {items.map((item) => {
            const href = buildNavHref(basePath, item.segment);
            const isIndex = item.segment === ROUTE_SEGMENTS.dashboard;
            const isCurrent = isItemActive(pathname, href, isIndex);

            return (
              <SidebarItem key={item.labelKey} href={href} current={isCurrent}>
                <item.icon data-slot="icon" />
                <SidebarLabel>{t(item.labelKey)}</SidebarLabel>
              </SidebarItem>
            );
          })}
        </SidebarSection>

        <SidebarSpacer />

        {showSettings && (
          <SidebarSection>
            <SidebarItem
              href={buildNavHref(basePath, ROUTE_SEGMENTS.settings)}
              current={isItemActive(
                pathname,
                buildNavHref(basePath, ROUTE_SEGMENTS.settings),
              )}
            >
              <Cog6ToothIcon data-slot="icon" />
              <SidebarLabel>{t("settings")}</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
        )}
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
