import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ROUTES } from "@/lib/navigation/routes";

interface AuthCallbackPageProps {
  params: Promise<{
    locale: string;
    tenant: string;
  }>;
}

export default async function AuthCallbackPage({
  params,
}: AuthCallbackPageProps) {
  const { tenant, locale } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/${locale}${ROUTES.auth.orgSignIn(tenant)}`);
  }

  // Get user's role and determine redirect
  const authState = await fetchQuery(api.users.getAuthState);

  if (!authState.authenticated || "error" in authState) {
    redirect(`/${locale}${ROUTES.auth.orgSignIn(tenant)}`);
  }

  const { roles } = authState;

  // Check for SuperAdmin or LeagueAdmin first (they have access to the org dashboard)
  const adminRole = roles.find(
    (r) =>
      r.role === "SuperAdmin" ||
      (r.role === "LeagueAdmin" && r.organizationSlug === tenant),
  );

  if (adminRole) {
    redirect(`/${locale}${ROUTES.org.root(tenant)}`);
  }

  // Check for ClubAdmin (delegate) - they should go to their team
  const clubAdminRole = roles.find(
    (r) =>
      r.role === "ClubAdmin" &&
      r.organizationType === "club" &&
      r.leagueSlug === tenant,
  );

  if (clubAdminRole?.organizationSlug) {
    redirect(
      `/${locale}${ROUTES.team.root(tenant, clubAdminRole.organizationSlug)}`,
    );
  }

  // Check for TechnicalDirector or Player - they should go to their team
  const staffRole = roles.find(
    (r) =>
      (r.role === "TechnicalDirector" || r.role === "Player") &&
      r.organizationType === "club" &&
      r.leagueSlug === tenant,
  );

  if (staffRole?.organizationSlug) {
    redirect(
      `/${locale}${ROUTES.team.root(tenant, staffRole.organizationSlug)}`,
    );
  }

  // Check if user has any role in this league (maybe a club role without leagueSlug match)
  const anyClubRole = roles.find(
    (r) => r.organizationType === "club" && r.leagueSlug === tenant,
  );

  if (anyClubRole?.organizationSlug) {
    redirect(
      `/${locale}${ROUTES.team.root(tenant, anyClubRole.organizationSlug)}`,
    );
  }

  // User has no role in this organization - redirect to global sign-in
  redirect(`/${locale}${ROUTES.auth.signIn}`);
}
