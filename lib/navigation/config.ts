import {
  HomeIcon,
  Cog6ToothIcon,
  UsersIcon,
  ChartBarIcon,
  CalendarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  TrophyIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/20/solid";
import type { AppRole } from "@/convex/lib/auth_types";
import type { RoleNavigationConfig } from "./types";
import { ROUTE_SEGMENTS } from "@/lib/routes";

/**
 * =============================================================================
 * CONFIGURACIÓN DE NAVEGACIÓN POR ROL
 * =============================================================================
 */

export const NAVIGATION_CONFIG: Record<AppRole, RoleNavigationConfig> = {
  /**
   * SuperAdmin - Acceso completo a toda la plataforma
   */
  SuperAdmin: [
    {
      label: "Dashboard",
      icon: HomeIcon,
      href: ROUTE_SEGMENTS.dashboard,
    },
    {
      label: "Organizations",
      icon: BuildingLibraryIcon,
      href: ROUTE_SEGMENTS.organizations,
    },
    {
      label: "Users",
      icon: UsersIcon,
      href: ROUTE_SEGMENTS.users,
    },
    {
      label: "Analytics",
      icon: ChartBarIcon,
      href: ROUTE_SEGMENTS.analytics,
    },
    {
      label: "Settings",
      icon: Cog6ToothIcon,
      href: ROUTE_SEGMENTS.settings,
    },
  ],

  /**
   * LeagueAdmin - Gestión de liga completa
   */
  LeagueAdmin: [
    {
      label: "Dashboard",
      icon: HomeIcon,
      href: ROUTE_SEGMENTS.dashboard,
    },
    {
      label: "Clubs",
      icon: BuildingOfficeIcon,
      href: ROUTE_SEGMENTS.clubs,
    },
    {
      label: "Users",
      icon: UsersIcon,
      href: ROUTE_SEGMENTS.users,
    },
    {
      label: "Categories",
      icon: UserGroupIcon,
      href: ROUTE_SEGMENTS.categories,
    },
    {
      label: "Matches",
      icon: CalendarIcon,
      href: ROUTE_SEGMENTS.matches,
    },
    {
      label: "Analytics",
      icon: ChartBarIcon,
      href: ROUTE_SEGMENTS.analytics,
    },
    {
      label: "Settings",
      icon: Cog6ToothIcon,
      href: ROUTE_SEGMENTS.settings,
    },
  ],

  /**
   * ClubAdmin - Gestión de club
   */
  ClubAdmin: [
    {
      label: "Categories",
      icon: TrophyIcon,
      href: ROUTE_SEGMENTS.categories,
    },
    {
      label: "Players",
      icon: UsersIcon,
      href: ROUTE_SEGMENTS.players,
    },
    {
      label: "Staff",
      icon: UserGroupIcon,
      href: ROUTE_SEGMENTS.staff,
    },
    {
      label: "Settings",
      icon: Cog6ToothIcon,
      href: ROUTE_SEGMENTS.settings,
    },
  ],

  /**
   * TechnicalDirector - Vista de entrenador
   */
  TechnicalDirector: [
    {
      label: "Dashboard",
      icon: HomeIcon,
      href: ROUTE_SEGMENTS.dashboard,
    },
    {
      label: "My Teams",
      icon: UserGroupIcon,
      href: ROUTE_SEGMENTS.teams,
    },
    {
      label: "Players",
      icon: UsersIcon,
      href: ROUTE_SEGMENTS.players,
    },
    {
      label: "Training",
      icon: CalendarIcon,
      href: ROUTE_SEGMENTS.training,
    },
    {
      label: "Matches",
      icon: TrophyIcon,
      href: ROUTE_SEGMENTS.matches,
    },
    {
      label: "Reports",
      icon: DocumentTextIcon,
      href: ROUTE_SEGMENTS.reports,
    },
  ],

  /**
   * Player - Vista de jugador
   */
  Player: [
    {
      label: "Home",
      icon: HomeIcon,
      href: ROUTE_SEGMENTS.dashboard,
    },
    {
      label: "My Team",
      icon: UserGroupIcon,
      href: ROUTE_SEGMENTS.teams,
    },
    {
      label: "Schedule",
      icon: CalendarIcon,
      href: ROUTE_SEGMENTS.schedule,
    },
    {
      label: "Stats",
      icon: ChartBarIcon,
      href: ROUTE_SEGMENTS.stats,
    },
    {
      label: "Profile",
      icon: Cog6ToothIcon,
      href: ROUTE_SEGMENTS.profile,
    },
  ],

  /**
   * Referee - Vista de árbitro
   */
  Referee: [
    {
      label: "Dashboard",
      icon: HomeIcon,
      href: ROUTE_SEGMENTS.dashboard,
    },
    {
      label: "My Matches",
      icon: ClipboardDocumentCheckIcon,
      href: ROUTE_SEGMENTS.matches,
    },
    {
      label: "Schedule",
      icon: CalendarIcon,
      href: ROUTE_SEGMENTS.schedule,
    },
    {
      label: "Reports",
      icon: DocumentTextIcon,
      href: ROUTE_SEGMENTS.reports,
    },
    {
      label: "Profile",
      icon: Cog6ToothIcon,
      href: ROUTE_SEGMENTS.profile,
    },
  ],
};

/**
 * Mapeo de roles a sus rutas base
 */
export const ROLE_BASE_PATHS: Record<AppRole, string> = {
  SuperAdmin: "admin",
  LeagueAdmin: "",
  ClubAdmin: "",
  TechnicalDirector: "",
  Player: "",
  Referee: "",
};