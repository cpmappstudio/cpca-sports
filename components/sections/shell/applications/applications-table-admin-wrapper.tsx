"use client";

import { Authenticated, Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import CpcaHeader from "@/components/common/cpca-header";
import { ApplicationsTable } from "./applications-table";
import { ApplicationsAnalytics } from "./applications-analytics";

interface ApplicationsTableAdminWrapperProps {
  preloadedApplications: Preloaded<
    typeof api.applications.listByOrganizationSummary
  >;
  organizationSlug: string;
  title: string;
  subtitle: string;
  logoUrl?: string;
  analyticsNow: number;
}

function ApplicationsTableContent({
  preloadedApplications,
  organizationSlug,
  title,
  subtitle,
  logoUrl,
  analyticsNow,
}: ApplicationsTableAdminWrapperProps) {
  const applications = usePreloadedQuery(preloadedApplications);

  return (
    <>
      <CpcaHeader
        title={title}
        subtitle={subtitle}
        logoUrl={logoUrl}
        action={
          <ApplicationsAnalytics
            applications={applications}
            now={analyticsNow}
          />
        }
      />
      <ApplicationsTable
        applications={applications}
        organizationSlug={organizationSlug}
        isAdmin={true}
      />
    </>
  );
}

export function ApplicationsTableAdminWrapper(
  props: ApplicationsTableAdminWrapperProps,
) {
  return (
    <Authenticated>
      <ApplicationsTableContent {...props} />
    </Authenticated>
  );
}
