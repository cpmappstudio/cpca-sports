import {
  HomeIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  UsersIcon,
  CreditCardIcon,
} from "@heroicons/react/20/solid";
import { ROUTE_SEGMENTS } from "@/lib/routes";
import type { NavItem, NavConfig, NavContext } from "./types";

const ADMIN_ITEMS: NavItem[] = [
  {
    segment: ROUTE_SEGMENTS.dashboard,
    labelKey: "dashboard",
    icon: HomeIcon,
  },
  {
    segment: ROUTE_SEGMENTS.organizations,
    labelKey: "organizations",
    icon: BuildingLibraryIcon,
  },
];

const ORG_ITEMS: NavItem[] = [
  {
    segment: ROUTE_SEGMENTS.dashboard,
    labelKey: "dashboard",
    icon: HomeIcon,
  },
  {
    segment: ROUTE_SEGMENTS.offerings,
    labelKey: "offerings",
    icon: DocumentTextIcon,
  },
  {
    segment: ROUTE_SEGMENTS.applications,
    labelKey: "applications",
    icon: ClipboardDocumentListIcon,
  },
  {
    segment: ROUTE_SEGMENTS.members,
    labelKey: "members",
    icon: UserGroupIcon,
  },
  {
    segment: ROUTE_SEGMENTS.fees,
    labelKey: "fees",
    icon: CurrencyDollarIcon,
  },
  {
    segment: ROUTE_SEGMENTS.forms,
    labelKey: "forms",
    icon: DocumentDuplicateIcon,
  },
  {
    segment: ROUTE_SEGMENTS.staff,
    labelKey: "staff",
    icon: UsersIcon,
  },
  {
    segment: ROUTE_SEGMENTS.payments,
    labelKey: "payments",
    icon: CreditCardIcon,
  },
];

const NAV_CONFIGS: Record<NavContext, NavConfig> = {
  admin: {
    items: ADMIN_ITEMS,
    showSettings: true,
  },
  league: {
    items: ORG_ITEMS,
    showSettings: true,
  },
  club: {
    items: ORG_ITEMS,
    showSettings: true,
  },
};

export function getNavConfig(context: NavContext): NavConfig {
  return NAV_CONFIGS[context];
}

export function buildNavHref(basePath: string, segment: string): string {
  if (segment === "") {
    return basePath || "/";
  }
  return `${basePath}/${segment}`;
}

export function isItemActive(
  pathname: string,
  href: string,
  isIndex: boolean = false,
): boolean {
  if (isIndex) {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname.startsWith(href);
}
