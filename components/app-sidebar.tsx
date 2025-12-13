"use client";

import { useParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  ChevronDownIcon,
  CheckIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  GlobeAmericasIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
} from "@heroicons/react/20/solid";
import {
  buildNavUrl,
  getNavigationContext,
  isNavItemActive,
} from "@/lib/navigation/utils";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";
import type { AppRole } from "@/convex/lib/auth_types";
import { useTranslations } from "next-intl";

// Type for organization data from getMyOrganizations query
type OrgData = {
  _id: string;
  slug: string;
  name: string;
  role: AppRole;
  type: "league" | "club";
  logoUrl?: string;
  leagueSlug?: string;
};

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

function OrgSwitcher({ currentLeagueSlug, currentClubSlug }: { currentLeagueSlug: string | null; currentClubSlug: string | null }) {
  const myOrgs = useQuery(api.users.getMyOrganizations);
  const [isOpen, setIsOpen] = useState(false);

  // Collapsible Section State
  const [showLeagues, setShowLeagues] = useState(true);
  const [showClubs, setShowClubs] = useState(true);

  // 1. Loading State (Skeleton)
  if (myOrgs === undefined) {
    return (
      <div className="p-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted/50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Empty State
  if (myOrgs.length === 0) {
    return (
      <div className="p-3 text-sm text-muted-foreground text-center border border-dashed rounded-md m-2">
        No organizations found
      </div>
    );
  }

  // Group Data
  const leagues = myOrgs.filter((org) => org.type === "league");
  const clubs = myOrgs.filter((org) => org.type === "club");

  // Determine what is currently selected
  const currentClub = currentClubSlug
    ? clubs.find((org) => org.slug === currentClubSlug)
    : null;
  const currentLeague = currentLeagueSlug
    ? leagues.find((org) => org.slug === currentLeagueSlug)
    : null;

  const isSuperAdmin = myOrgs.some((org) => org.role === "SuperAdmin");
  const isInSuperAdminView = currentLeagueSlug === null && currentClubSlug === null;

  // Helper to render a league item
  const renderLeagueItem = (org: OrgData) => (
    <Link
      key={org._id}
      href={ROUTES.league.root(org.slug)}
      onClick={() => setIsOpen(false)}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors ${org.slug === currentLeagueSlug && !currentClubSlug ? "bg-muted" : ""
        }`}
    >
      {org.logoUrl ? (
        <img
          src={org.logoUrl}
          alt={org.name}
          className="h-8 w-8 rounded object-cover shrink-0"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary font-semibold text-sm shrink-0">
          {org.name[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{org.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          League • {org.role}
        </div>
      </div>
      {org.slug === currentLeagueSlug && !currentClubSlug && (
        <CheckIcon className="h-4 w-4 text-primary shrink-0" />
      )}
    </Link>
  );

  // Helper to render a club item
  const renderClubItem = (org: OrgData) => {
    // Use the leagueSlug from the org data (fetched from backend)
    const clubLeagueSlug = org.leagueSlug;

    if (!clubLeagueSlug) {
      // Fallback: don't render if we don't have the league slug
      console.warn(`Club ${org.slug} missing leagueSlug`);
      return null;
    }

    return (
      <Link
        key={org._id}
        href={ROUTES.club.root(clubLeagueSlug, org.slug)}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors ${org.slug === currentClubSlug ? "bg-muted" : ""
          }`}
      >
        {org.logoUrl ? (
          <img
            src={org.logoUrl}
            alt={org.name}
            className="h-8 w-8 rounded object-cover shrink-0"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary font-semibold text-sm shrink-0">
            {org.name[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{org.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            Club • {org.role}
          </div>
        </div>
        {org.slug === currentClubSlug && (
          <CheckIcon className="h-4 w-4 text-primary shrink-0" />
        )}
      </Link>
    );
  };

  // Determine current display
  const displayOrg = currentClub || currentLeague;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isInSuperAdminView ? (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                <GlobeAmericasIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Global Admin</div>
                <div className="text-xs text-muted-foreground">System Access</div>
              </div>
            </>
          ) : displayOrg ? (
            <>
              {displayOrg.logoUrl ? (
                <img
                  src={displayOrg.logoUrl}
                  alt={displayOrg.name}
                  className="h-8 w-8 rounded object-cover shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary font-semibold text-sm shrink-0">
                  {displayOrg.name[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {displayOrg.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {displayOrg.type === "league" ? "League" : "Club"}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm font-medium">Select Organization</div>
          )}
        </div>
        <ChevronDownIcon className={`h-4 w-4 text-muted-foreground shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border bg-popover shadow-lg max-h-[80vh] overflow-y-auto flex flex-col p-1">

            {/* 1. Global / SuperAdmin Access */}
            {isSuperAdmin && (
              <div className="mb-1">
                <Link
                  href={ROUTES.admin.root}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors ${isInSuperAdminView ? "bg-muted" : ""
                    }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-600 text-white font-semibold text-sm shrink-0">
                    <GlobeAmericasIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Global Dashboard</div>
                    <div className="text-xs text-muted-foreground">System Admin</div>
                  </div>
                  {isInSuperAdminView && (
                    <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                  )}
                </Link>
              </div>
            )}

            {/* 2. Leagues Group */}
            {leagues.length > 0 && (
              <div className="mt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowLeagues(!showLeagues); }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 rounded-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldCheckIcon className="h-3 w-3" />
                    <span>LEAGUES ({leagues.length})</span>
                  </div>
                  {showLeagues ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                </button>

                {showLeagues && (
                  <div className="mt-0.5 space-y-0.5 pl-1">
                    {leagues.map(renderLeagueItem)}
                  </div>
                )}
              </div>
            )}

            {/* 3. Clubs Group */}
            {clubs.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowClubs(!showClubs); }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 rounded-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <BuildingOfficeIcon className="h-3 w-3" />
                    <span>CLUBS ({clubs.length})</span>
                  </div>
                  {showClubs ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                </button>

                {showClubs && (
                  <div className="mt-0.5 space-y-0.5 pl-1">
                    {clubs.map(renderClubItem)}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function SidebarAppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations("Navigation.nav");
  const leagueSlug = (params.league as string) || null;
  const clubSlug = (params.club as string) || null;

  const isInSuperAdminView = pathname.startsWith("/admin");

  // Determine org context based on route
  const orgSlug = clubSlug || leagueSlug;
  const orgType = clubSlug ? "club" : "league";

  // Fetch org details - always call hook, use "skip" when no orgSlug
  const orgDetails = useQuery(
    api.organizations.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );

  // Fetch current role - always call hook, use "skip" when no orgSlug
  const currentRole = useQuery(
    api.users.getMyRoleInOrg,
    orgSlug
      ? {
        orgSlug,
        orgType: orgDetails?.type || orgType,
      }
      : "skip"
  );

  const roleToUse = isInSuperAdminView ? "SuperAdmin" : currentRole || null;

  // Build base path for navigation
  const basePath = isInSuperAdminView
    ? "/admin"
    : clubSlug
      ? `/${leagueSlug}/${clubSlug}`
      : leagueSlug
        ? `/${leagueSlug}`
        : "";

  const { navItems } = getNavigationContext(
    orgSlug || "",
    roleToUse,
    orgDetails?.type || orgType
  );

  // Loading State
  if (orgSlug && (currentRole === undefined || orgDetails === undefined)) {
    return (
      <Sidebar>
        <SidebarHeader>
          <OrgSwitcher currentLeagueSlug={leagueSlug} currentClubSlug={clubSlug} />
        </SidebarHeader>
        <SidebarBody>
          <div className="p-4 space-y-4">
            <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-muted/50 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-muted/50 rounded animate-pulse" />
          </div>
        </SidebarBody>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <OrgSwitcher currentLeagueSlug={leagueSlug} currentClubSlug={clubSlug} />
      </SidebarHeader>

      <SidebarBody>
        {navItems.length > 0 && (
          <SidebarSection>
            {navItems.map((item) => {
              const href = buildNavUrl(basePath, item.href);
              const isCurrent = isNavItemActive(pathname, href, item.href === "");

              return (
                <SidebarItem key={item.label} href={href} current={isCurrent}>
                  <item.icon data-slot="icon" />
                  <SidebarLabel >{t(item.label)}</SidebarLabel>
                </SidebarItem>
              );
            })}
          </SidebarSection>
        )}

        <SidebarSpacer />

        <SidebarSection>
          <SidebarItem href={buildNavUrl(basePath, "settings")} current={isNavItemActive(pathname, buildNavUrl(basePath, "settings"))}>
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
