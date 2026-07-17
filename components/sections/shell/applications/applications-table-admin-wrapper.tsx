"use client";

import { useCallback, useState } from "react";
import { Authenticated, Preloaded, usePreloadedQuery } from "convex/react";
import { Archive, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import CpcaHeader from "@/components/common/cpca-header";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList>
            <TabsTrigger
              value="active"
              className="gap-1 px-2 text-xs md:px-3 md:text-sm"
            >
              <Inbox className="hidden h-4 w-4 md:block" />
              <span>{t("tabs.active")}</span>
              <span className="text-muted-foreground">
                ({applications.length})
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              className="gap-1 px-2 text-xs md:px-3 md:text-sm"
            >
              <Archive className="hidden h-4 w-4 md:block" />
              <span>{t("tabs.archived")}</span>
              <span className="text-muted-foreground">
                ({archivedApplications.length})
              </span>
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
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
