import "server-only";

import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";

interface TenantAccess {
  hasAccess: boolean;
  isAdmin: boolean;
}

function isAdminRole(role: string | undefined) {
  return role === "admin" || role === "superadmin";
}

/**
 * Resolve the current user's access level for a tenant slug.
 * Uses Convex memberships so it doesn't depend on Clerk active-org sync timing.
 */
export async function getTenantAccess(
  tenant: string,
  token?: string,
): Promise<TenantAccess> {
  const resolvedToken = token ?? (await getAuthToken());
  const currentUser = await fetchQuery(
    api.users.me,
    {},
    { token: resolvedToken },
  );

  if (!currentUser) {
    return { hasAccess: false, isAdmin: false };
  }

  const membership = currentUser.memberships.find(
    (item) => item.organizationSlug === tenant,
  );
  const hasAccess = currentUser.isSuperAdmin || Boolean(membership);
  const isAdmin = currentUser.isSuperAdmin || isAdminRole(membership?.role);

  return { hasAccess, isAdmin };
}
