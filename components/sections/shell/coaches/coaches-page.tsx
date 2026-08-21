"use client";

import { useState } from "react";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import { Archive, Inbox } from "lucide-react";
import { api } from "@/convex/_generated/api";
import CpcaHeader from "@/components/common/cpca-header";
import { TabsNavigation } from "@/components/common/tabs-navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CoachesTable } from "./coaches-table";
import { useTranslations } from "next-intl";

export function CoachesPage({
  activeQuery,
  archivedQuery,
  programsQuery,
  tenant,
  logoUrl,
  initialTab = "active",
}: {
  activeQuery: Preloaded<typeof api.coaches.listByOrganization>;
  archivedQuery: Preloaded<typeof api.coaches.listByOrganization>;
  programsQuery: Preloaded<typeof api.programs.listByOrganization>;
  tenant: string;
  logoUrl?: string;
  initialTab?: "active" | "archived";
}) {
  const active = usePreloadedQuery(activeQuery);
  const archived = usePreloadedQuery(archivedQuery);
  const programs = usePreloadedQuery(programsQuery);
  const [tab, setTab] = useState<"active" | "archived">(initialTab);
  const t = useTranslations("Coaches.page");
  return (
    <>
      <CpcaHeader
        title={t("title")}
        subtitle={t("description")}
        logoUrl={logoUrl}
      />
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "active" | "archived")}
        className="w-full"
      >
        <TabsNavigation
          items={[
            {
              value: "active",
              label: t("active"),
              icon: Inbox,
              count: active.length,
            },
            {
              value: "archived",
              label: t("archived"),
              icon: Archive,
              count: archived.length,
            },
          ]}
        />
        <TabsContent value="active" className="mt-0">
          <CoachesTable
            coaches={active}
            tenant={tenant}
            programs={programs}
            emptyMessage={t("emptyActive")}
          />
        </TabsContent>
        <TabsContent value="archived" className="mt-0">
          <CoachesTable
            coaches={archived}
            tenant={tenant}
            programs={programs}
            emptyMessage={t("emptyArchived")}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
