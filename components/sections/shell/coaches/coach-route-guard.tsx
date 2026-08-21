"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/lib/navigation/routes";

export function CoachRouteGuard({
  children,
  tenant,
  isTenantAdmin,
  initialCoachId,
}: {
  children: React.ReactNode;
  tenant: string;
  isTenantAdmin: boolean;
  initialCoachId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const refreshedAfterDiscovery = useRef(false);
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const queriedCoachId = useQuery(
    api.coaches.getMine,
    isTenantAdmin || initialCoachId || !isAuthenticated
      ? "skip"
      : { organizationSlug: tenant },
  );
  const coachId = initialCoachId ?? queriedCoachId ?? undefined;
  const isResolvingCoach =
    !isTenantAdmin &&
    !initialCoachId &&
    (isAuthLoading || !isAuthenticated || queriedCoachId === undefined);
  const coachPath = coachId
    ? ROUTES.org.coaches.detail(tenant, coachId)
    : undefined;
  const profilePath = ROUTES.org.settings.profileSecurity(tenant);
  const appearancePath = ROUTES.org.settings.appearance(tenant);
  const isAllowedCoachPath = Boolean(
    coachPath &&
    (pathname === coachPath || pathname.startsWith(`${coachPath}/`)),
  );
  const isAllowedProfilePath =
    pathname === profilePath || pathname.startsWith(`${profilePath}/`);
  const isAllowedAppearancePath =
    pathname === appearancePath || pathname.startsWith(`${appearancePath}/`);
  const shouldRedirect = Boolean(
    coachId &&
    !isAllowedCoachPath &&
    !isAllowedProfilePath &&
    !isAllowedAppearancePath,
  );

  useEffect(() => {
    if (shouldRedirect && coachPath) {
      router.replace(coachPath);
      return;
    }
    if (!initialCoachId && queriedCoachId && !refreshedAfterDiscovery.current) {
      refreshedAfterDiscovery.current = true;
      router.refresh();
    }
  }, [coachPath, initialCoachId, queriedCoachId, router, shouldRedirect]);

  if (isResolvingCoach || shouldRedirect) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return children;
}
