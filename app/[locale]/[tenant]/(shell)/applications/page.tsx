import { preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";
import { getTranslations } from "next-intl/server";
import { ApplicationsTableWrapper } from "@/components/sections/shell/applications/applications-table-wrapper";
import { ApplicationsTableAdminWrapper } from "@/components/sections/shell/applications/applications-table-admin-wrapper";

import { preloadedQueryResult } from "convex/nextjs";
import { ROUTES } from "@/lib/navigation/routes";
import { getTenantAccess } from "@/lib/auth/tenant-access";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ApplicationsPage({ params }: PageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();
  const [{ isAdmin }, t, preloadedOrganization] = await Promise.all([
    getTenantAccess(tenant, token),
    getTranslations("Applications.page"),
    preloadQuery(api.organizations.getBySlug, { slug: tenant }, { token }),
  ]);
  const organization = preloadedQueryResult(preloadedOrganization);

  if (isAdmin) {
    // Request-scoped server value serialized to the client for hydration-stable buckets.
    // eslint-disable-next-line react-hooks/purity
    const analyticsNow = Date.now();
    const preloadedApplications = await preloadQuery(
      api.applications.listByOrganizationSummary,
      { organizationSlug: tenant },
      { token },
    );

    return (
      <ApplicationsTableAdminWrapper
        preloadedApplications={preloadedApplications}
        organizationSlug={tenant}
        title={t("titleAdmin")}
        subtitle={t("descriptionAdmin")}
        logoUrl={organization?.imageUrl}
        analyticsNow={analyticsNow}
      />
    );
  }

  const preloadedApplications = await preloadQuery(
    api.applications.listMineByOrganizationSummary,
    { organizationSlug: tenant },
    { token },
  );
  const applications = preloadedQueryResult(preloadedApplications);

  if (applications.length === 0) {
    redirect(ROUTES.org.applications.create(tenant));
  }

  return (
    <ApplicationsTableWrapper
      preloadedApplications={preloadedApplications}
      organizationSlug={tenant}
      title={t("titleClient")}
      subtitle={t("descriptionClient")}
      logoUrl={organization?.imageUrl}
    />
  );
}
