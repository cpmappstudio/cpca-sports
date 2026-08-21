import "server-only";

import { auth } from "@clerk/nextjs/server";
import { getAuthToken } from "@/lib/auth/auth";
import { getTenantAccess } from "@/lib/auth/tenant-access";

export class CoachRouteError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireCoachRouteAdmin(tenant: string) {
  const { userId } = await auth();
  if (!userId) throw new CoachRouteError(401, "Unauthorized");
  const token = await getAuthToken();
  if (!token) throw new CoachRouteError(401, "Unauthorized");
  const access = await getTenantAccess(tenant, token);
  if (!access.hasAccess || !access.isAdmin) {
    throw new CoachRouteError(403, "Forbidden");
  }
  return { token };
}

export function coachRouteError(error: unknown, fallback: string) {
  const errorStatus = (error as { status?: unknown })?.status;
  const status =
    error instanceof CoachRouteError
      ? error.status
      : typeof errorStatus === "number"
        ? errorStatus
        : 500;
  const clerkMessage = (
    error as { errors?: Array<{ longMessage?: string; message?: string }> }
  )?.errors?.[0];
  return {
    status,
    message:
      clerkMessage?.longMessage ??
      clerkMessage?.message ??
      (error instanceof Error ? error.message : fallback),
  };
}
