import { preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";
import { getTranslations } from "next-intl/server";
import { ApplicationsTableWrapper } from "@/components/sections/shell/applications/applications-table-wrapper";
import { ApplicationsTableAdminWrapper } from "@/components/sections/shell/applications/applications-table-admin-wrapper";
import CpcaHeader from "@/components/common/cpca-header";
import { preloadedQueryResult } from "convex/nextjs";
import { ROUTES } from "@/lib/navigation/routes";
import { getTenantAccess } from "@/lib/auth/tenant-access";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ApplicationsPage({ params }: PageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();
  const { isAdmin } = await getTenantAccess(tenant, token);
  const t = await getTranslations("Applications.page");

  // Get organization data for logo
  const preloadedOrganization = await preloadQuery(
    api.organizations.getBySlug,
    { slug: tenant },
    { token },
  );
  const organization = preloadedQueryResult(preloadedOrganization);

  if (isAdmin) {
    const preloadedApplications = await preloadQuery(
      api.applications.listByOrganization,
      { organizationSlug: tenant },
      { token },
    );

    return (
      <>
        <CpcaHeader
          title={t("titleAdmin")}
          subtitle={t("descriptionAdmin")}
          logoUrl={organization?.imageUrl}
        />
        <ApplicationsTableAdminWrapper
          preloadedApplications={preloadedApplications}
          organizationSlug={tenant}
        />
      </>
    );
  }

  const preloadedApplications = await preloadQuery(
    api.applications.listMine,
    {},
    { token },
  );
  const applications = preloadedQueryResult(preloadedApplications);
  const scopedApplications = organization
    ? applications.filter((item) => item.organizationId === organization._id)
    : [];

  if (scopedApplications.length === 0) {
    redirect(ROUTES.org.applications.create(tenant));
  }

  return (
    <>
      <CpcaHeader
        title={t("titleClient")}
        subtitle={t("descriptionClient")}
        logoUrl={organization?.imageUrl}
      />
      <ApplicationsTableWrapper
        preloadedApplications={preloadedApplications}
        organizationSlug={tenant}
        organizationId={organization?._id}
      />
    </>
  );
}
