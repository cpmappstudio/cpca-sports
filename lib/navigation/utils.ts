import type { AppRole } from "@/convex/lib/auth_types";
import type { NavItem, NavigationContext } from "./types";
import {
  HomeIcon,
  UsersIcon,
  TrophyIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";

export function getNavigationContext(
  orgSlug: string,
  role: AppRole | null,
  orgType?: "league" | "club" | null
): NavigationContext {
  if (!role) {
    return { role: null, navItems: [], basePath: "" };
  }

  const roleBasePaths: Record<AppRole, string> = {
    SuperAdmin: "admin",
    LeagueAdmin: "admin",
    ClubAdmin: "admin",
    TechnicalDirector: "coach",
    Player: "player",
    Referee: "referee",
  };

  const basePath = orgSlug ? `/${orgSlug}/${roleBasePaths[role]}` : "/admin";

  // 1. SUPER ADMIN LOGIC
  if (role === "SuperAdmin") {
    if (orgSlug && orgType) {
      if (orgType === "league") {
        return {
          role,
          basePath: basePath,
          navItems: [
            { label: "dashboard", href: "", icon: HomeIcon },
            { label: "clubs", href: "clubs", icon: BuildingOfficeIcon },
            { label: "tournaments", href: "tournaments", icon: TrophyIcon },
            { label: "divisions", href: "divisions", icon: ChartBarIcon },
            { label: "referees", href: "referees", icon: ShieldCheckIcon },
          ],
        };
      }

      if (orgType === "club") {
        return {
          role,
          basePath: basePath,
          navItems: [
            { label: "teams", href: "teams", icon: TrophyIcon },
            { label: "players", href: "players", icon: UserGroupIcon },
            { label: "staff", href: "staff", icon: UsersIcon },
          ],
        };
      }
    }

    return {
      role,
      basePath: basePath,
      navItems: [
        { label: "globalDashboard", href: "", icon: HomeIcon },
        { label: "leagues", href: "leagues", icon: TrophyIcon },
        { label: "clubs", href: "clubs", icon: BuildingOfficeIcon },
        { label: "users", href: "users", icon: UsersIcon },
      ],
    };
  }

  // 2. LEAGUE ADMIN
  if (role === "LeagueAdmin") {
    return {
      role,
      basePath,
      navItems: [
        { label: "dashboard", href: "", icon: HomeIcon },
        { label: "clubs", href: "clubs", icon: BuildingOfficeIcon },
        { label: "tournaments", href: "tournaments", icon: TrophyIcon },
        { label: "divisions", href: "divisions", icon: ChartBarIcon },
        { label: "referees", href: "referees", icon: ShieldCheckIcon },
      ],
    };
  }

  // 3. CLUB ADMIN
  if (role === "ClubAdmin") {
    return {
      role,
      basePath,
      navItems: [
        { label: "teams", href: "teams", icon: TrophyIcon },
        { label: "players", href: "players", icon: UserGroupIcon },
        { label: "staff", href: "staff", icon: UsersIcon },
      ],
    };
  }

  // 4. TECHNICAL DIRECTOR
  if (role === "TechnicalDirector") {
    return {
      role,
      basePath,
      navItems: [
        { label: "dashboard", href: "", icon: HomeIcon },
        { label: "myTeam", href: "players", icon: UserGroupIcon },
        { label: "matches", href: "matches", icon: CalendarIcon },
        { label: "training", href: "training", icon: ClipboardDocumentCheckIcon },
      ],
    };
  }

  // 5. PLAYER NAVIGATION
  if (role === "Player") {
    return {
      role,
      basePath,
      navItems: [
        { label: "dashboard", href: "", icon: HomeIcon },
        { label: "myMatches", href: "matches", icon: CalendarIcon },
        { label: "profile", href: "profile", icon: UsersIcon },
      ],
    };
  }

  // 6. REFEREE NAVIGATION
  if (role === "Referee") {
    return {
      role,
      basePath,
      navItems: [
        { label: "dashboard", href: "", icon: HomeIcon },
        { label: "assignments", href: "matches", icon: CalendarIcon },
        { label: "reports", href: "reports", icon: ClipboardDocumentCheckIcon },
      ],
    };
  }

  return { role, basePath, navItems: [] };
}

/**
 * Build full navigation URL
 */
export function buildNavUrl(basePath: string, itemHref: string): string {
  if (itemHref === "") {
    return basePath;
  }
  const cleanHref = itemHref.startsWith("/") ? itemHref.slice(1) : itemHref;
  return `${basePath}/${cleanHref}`;
}

/**
 * Check if navigation item is active
 */
export function isNavItemActive(
  currentPath: string,
  itemHref: string,
  isIndex: boolean = false,
): boolean {
  if (isIndex) {
    // For index routes, match exactly or with trailing slash
    return currentPath === itemHref || currentPath === `${itemHref}/`;
  }

  // For other routes, check if current path starts with item href
  return currentPath.startsWith(itemHref);
}