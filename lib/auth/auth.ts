import type { auth } from "@clerk/nextjs/server";

export type Auth = Awaited<ReturnType<typeof auth>>;

export function isSuperAdmin(authObject: Auth): boolean {
  const metadata = authObject.sessionClaims?.metadata as
    | { isSuperAdmin?: boolean }
    | undefined;
  return metadata?.isSuperAdmin === true;
}

export function getActiveOrgSlug(authObject: Auth): string | null {
  return authObject.orgSlug ?? null;
}

export function getActiveOrgRole(authObject: Auth): string | null {
  return authObject.orgRole ?? null;
}
