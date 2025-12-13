import type { AppRole } from "@/convex/lib/auth_types";

type RoutePermissions = Record<string, AppRole[]>;

const ADMIN_ROLES: AppRole[] = ["SuperAdmin", "LeagueAdmin", "ClubAdmin"];
const STAFF_ROLES: AppRole[] = [...ADMIN_ROLES, "TechnicalDirector"];
const ALL_ROLES: AppRole[] = [...STAFF_ROLES, "Player", "Referee"];

export const ROUTE_PERMISSIONS: RoutePermissions = {
    "": ALL_ROLES,
    "players": STAFF_ROLES,
    "categories": STAFF_ROLES,
    "teams": STAFF_ROLES,
    "clubs": ["SuperAdmin", "LeagueAdmin"],
    "divisions": ["SuperAdmin", "LeagueAdmin"],
    "staff": ADMIN_ROLES,
    "users": ADMIN_ROLES,
    "settings": ADMIN_ROLES,
    "matches": ALL_ROLES,
    "schedule": ALL_ROLES,
    "training": ["TechnicalDirector"],
    "reports": STAFF_ROLES,
    "stats": ["Player"],
    "profile": ALL_ROLES,
    "team": ["Player"],
};

export function hasRouteAccess(role: AppRole | null, route: string): boolean {
    if (!role) return false;

    const normalizedRoute = route.replace(/^\//, "").split("/")[0] || "";
    const allowedRoles = ROUTE_PERMISSIONS[normalizedRoute];

    if (!allowedRoles) return false;

    return allowedRoles.includes(role);
}

export function canAccessRoute(role: AppRole | null, route: string): boolean {
    return hasRouteAccess(role, route);
}
