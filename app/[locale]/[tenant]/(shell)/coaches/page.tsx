import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";
import { getTenantAccess } from "@/lib/auth/tenant-access";
import { ROUTES } from "@/lib/navigation/routes";
import { CoachesPage } from "@/components/sections/shell/coaches/coaches-page";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tenant } = await params;
  const { tab } = await searchParams;
  const token = await getAuthToken();
  const access = await getTenantAccess(tenant, token);
  if (!access.isAdmin) {
    const mine = await preloadQuery(
      api.coaches.getMine,
      { organizationSlug: tenant },
      { token },
    );
    const coachId = preloadedQueryResult(mine);
    redirect(
      coachId
        ? ROUTES.org.coaches.detail(tenant, coachId)
        : ROUTES.org.applications.list(tenant),
    );
  }
  const organizationQuery = await preloadQuery(
    api.organizations.getBySlug,
    { slug: tenant },
    { token },
  );
  const organization = preloadedQueryResult(organizationQuery);
  if (!organization) redirect(ROUTES.auth.organizations);
  const [activeQuery, archivedQuery, programsQuery] = await Promise.all([
    preloadQuery(
      api.coaches.listByOrganization,
      { organizationSlug: tenant },
      { token },
    ),
    preloadQuery(
      api.coaches.listByOrganization,
      { organizationSlug: tenant, isArchived: true },
      { token },
    ),
    preloadQuery(
      api.programs.listByOrganization,
      { organizationId: organization._id },
      { token },
    ),
  ]);
  return (
    <CoachesPage
      activeQuery={activeQuery}
      archivedQuery={archivedQuery}
      programsQuery={programsQuery}
      tenant={tenant}
      logoUrl={organization?.imageUrl}
      initialTab={tab === "archived" ? "archived" : "active"}
    />
  );
}
