"use client";

import { useCallback, useState } from "react";
import { Authenticated, Preloaded, usePreloadedQuery } from "convex/react";
import { Archive, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import CpcaHeader from "@/components/common/cpca-header";
import { TabsNavigation } from "@/components/common/tabs-navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ApplicationsAnalytics } from "./applications-analytics";
import { ApplicationsTable } from "./applications-table";

interface ApplicationsTableAdminWrapperProps {
  preloadedApplications: Preloaded<
    typeof api.applications.listByOrganizationSummary
  >;
  preloadedArchivedApplications: Preloaded<
    typeof api.applications.listByOrganizationSummary
  >;
  organizationSlug: string;
  initialTab?: "active" | "archived";
  title: string;
  subtitle: string;
  logoUrl?: string;
  analyticsNow: number;
}

type ApplicationsTab = "active" | "archived";

function ApplicationsTableContent({
  preloadedApplications,
  preloadedArchivedApplications,
  organizationSlug,
  initialTab = "active",
  title,
  subtitle,
  logoUrl,
  analyticsNow,
}: ApplicationsTableAdminWrapperProps) {
  const applications = usePreloadedQuery(preloadedApplications);
  const archivedApplications = usePreloadedQuery(preloadedArchivedApplications);
  const t = useTranslations("Applications");
  const [activeTab, setActiveTab] = useState<ApplicationsTab>(initialTab);
  const [analyticsApplications, setAnalyticsApplications] = useState(
    initialTab === "active" ? applications : archivedApplications,
  );
  const handleFilteredApplicationsChange = useCallback(
    (nextApplications: typeof applications) => {
      setAnalyticsApplications((currentApplications) =>
        currentApplications.length === nextApplications.length &&
        currentApplications.every(
          (application, index) => application === nextApplications[index],
        )
          ? currentApplications
          : nextApplications,
      );
    },
    [],
  );
  const handleTabChange = (value: string) => {
    const tab = value as ApplicationsTab;
    setActiveTab(tab);
    setAnalyticsApplications(
      tab === "active" ? applications : archivedApplications,
    );
  };

  return (
    <>
      <CpcaHeader
        title={title}
        subtitle={subtitle}
        logoUrl={logoUrl}
        action={
          <ApplicationsAnalytics
            applications={analyticsApplications}
            now={analyticsNow}
          />
        }
      />
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsNavigation
          items={[
            {
              value: "active",
              label: t("tabs.active"),
              icon: Inbox,
              count: applications.length,
            },
            {
              value: "archived",
              label: t("tabs.archived"),
              icon: Archive,
              count: archivedApplications.length,
            },
          ]}
        />
        <TabsContent value="active" className="mt-0">
          <ApplicationsTable
            applications={applications}
            analyticsApplications={analyticsApplications}
            organizationSlug={organizationSlug}
            isAdmin={true}
            onFilteredApplicationsChange={handleFilteredApplicationsChange}
          />
        </TabsContent>
        <TabsContent value="archived" className="mt-0">
          <ApplicationsTable
            applications={archivedApplications}
            analyticsApplications={analyticsApplications}
            organizationSlug={organizationSlug}
            isAdmin={true}
            emptyMessage={t("emptyMessageArchived")}
            onFilteredApplicationsChange={handleFilteredApplicationsChange}
          />
        </TabsContent>
      </Tabs>
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
