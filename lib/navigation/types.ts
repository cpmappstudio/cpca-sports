import type { ForwardRefExoticComponent, SVGProps } from "react";
import type { AppRole } from "@/convex/lib/auth_types";
import {
  HomeIcon,
  TrophyIcon,
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export type NavItem = {
  label: string;
  icon: ForwardRefExoticComponent<SVGProps<SVGSVGElement>>;
  href: string;
};

/**
 * Configuración de navegación para un rol
 */
export type RoleNavigationConfig = NavItem[];

/**
 * Contexto de navegación completo
 */
export type NavigationContext = {
  role: AppRole | null;
  navItems: NavItem[];
  basePath: string;
};

export const iconMap = {
  home: HomeIcon,
  trophy: TrophyIcon,
  building: BuildingOfficeIcon,
  users: UsersIcon,
  "user-group": UserGroupIcon,
  shield: ShieldCheckIcon,
} as const;

export type IconName = keyof typeof iconMap;