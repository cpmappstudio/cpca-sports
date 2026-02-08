"use client";

import { Authenticated, Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ApplicationsTable } from "./applications-table";
import { Id } from "@/convex/_generated/dataModel";

interface ApplicationsTableWrapperProps {
  preloadedApplications: Preloaded<typeof api.applications.listMine>;
  organizationSlug: string;
  organizationId?: Id<"organizations">;
}

function ApplicationsTableContent({
  preloadedApplications,
  organizationSlug,
  organizationId,
}: ApplicationsTableWrapperProps) {
  const applications = usePreloadedQuery(preloadedApplications);
  const scopedApplications = organizationId
    ? applications.filter((item) => item.organizationId === organizationId)
    : applications;

  return (
    <ApplicationsTable
      applications={scopedApplications}
      organizationSlug={organizationSlug}
      isAdmin={false}
    />
  );
}

export function ApplicationsTableWrapper(props: ApplicationsTableWrapperProps) {
  return (
    <Authenticated>
      <ApplicationsTableContent {...props} />
    </Authenticated>
  );
}
