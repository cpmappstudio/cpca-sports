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
import { UserButton } from "@clerk/nextjs";
import { Cog6ToothIcon, ArrowLeftIcon } from "@heroicons/react/20/solid";
import { getTeamNavConfig, isItemActive } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/navigation/routes";
import { useSportTerminology } from "@/lib/sports";
import type { SportTerminology } from "@/lib/sports";
import { Link } from "@/components/ui/link";

const TERMINOLOGY_MAP: Record<string, keyof SportTerminology> = {
  roster: "players",
  schedule: "matches",
};

export function TeamNavbar() {
  return (
    <Navbar>
      <NavbarSpacer />
      <NavbarSection>
        <UserButton />
      </NavbarSection>
    </Navbar>
  );
}

export function TeamSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations("Navigation.nav");
  const terminology = useSportTerminology();

  const orgSlug = params.tenant as string;
  const teamSlug = params.team as string;

  const { items, settingsHref } = getTeamNavConfig();

  const getLabel = (labelKey: string): string => {
    const terminologyKey = TERMINOLOGY_MAP[labelKey];
    if (terminologyKey) {
      return terminology[terminologyKey];
    }
    return t(labelKey);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <Link
            href={ROUTES.org.teams.list(orgSlug)}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeftIcon className="size-4" />
            <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
              {teamSlug}
            </span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          {items.map((item) => {
            const href = item.href(orgSlug, teamSlug);
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
            href={settingsHref(orgSlug, teamSlug)}
            current={isItemActive(
              pathname,
              settingsHref(orgSlug, teamSlug),
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
