import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";
import { getTranslations } from 'next-intl/server';
import { ApplicationsTableWrapper } from "@/components/sections/shell/applications/applications-table-wrapper";
import { ApplicationsTableAdminWrapper } from "@/components/sections/shell/applications/applications-table-admin-wrapper";
import CpcaHeader from "@/components/common/cpca-header";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ApplicationsPage({ params }: PageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();
  const { has } = await auth();
  const t = await getTranslations('Applications.page');

  // Check if user is admin or superadmin using Clerk's official has() method
  const isSuperAdmin = has?.({ role: "org:superadmin" }) ?? false;
  const isOrgAdmin = has?.({ role: "org:admin" }) ?? false;
  const isAdmin = isOrgAdmin || isSuperAdmin;

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

  return (
    <>
      <CpcaHeader
        title={t("titleClient")}
        subtitle={t("descriptionClient")}
      />
      <ApplicationsTableWrapper
        preloadedApplications={preloadedApplications}
        organizationSlug={tenant}
      />
    </>
  );
}
