"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { darkenHex } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSportTerminology } from "@/lib/sports";
import { RosterGrid } from "./roster-grid";
import { TeamHeader } from "./team-header";

interface TeamDetailClientProps {
  preloadedTeam: Preloaded<typeof api.clubs.getBySlug>;
  orgSlug: string;
}

export function TeamDetailClient({
  preloadedTeam,
  orgSlug,
}: TeamDetailClientProps) {
  const terminology = useSportTerminology();
  const t = useTranslations("Common");
  const team = usePreloadedQuery(preloadedTeam);

  if (team === null) {
    return (
      <div className="p-4 md:p-6">
        <Heading>{t("errors.notFound")}</Heading>
      </div>
    );
  }

  const primaryColor = team.colors?.[0] ?? null;
  const darkerColor = primaryColor ? darkenHex(primaryColor, 0.3) : null;

  return (
    <div className="space-y-0">
      <TeamHeader team={team} orgSlug={orgSlug} />

      <Tabs defaultValue="roster" className="w-full">
        <TabsList
          className={
            darkerColor ? "w-full justify-start rounded-none py-2.5" : ""
          }
          style={
            darkerColor
              ? {
                  backgroundColor: darkerColor,
                  borderBottomLeftRadius: "8px",
                  borderBottomRightRadius: "8px",
                }
              : undefined
          }
        >
          <TabsTrigger
            value="roster"
            style={darkerColor ? { color: "white" } : undefined}
          >
            Roster
          </TabsTrigger>
          <TabsTrigger
            value="staff"
            style={darkerColor ? { color: "white" } : undefined}
          >
            {t("staff.title")}
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            style={darkerColor ? { color: "white" } : undefined}
          >
            {terminology.matches}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="roster">
          <RosterGrid clubSlug={team.slug} />
        </TabsContent>
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>{t("staff.title")}</CardTitle>
              <CardDescription>
                Manage the {terminology.club.toLowerCase()}&apos;s staff here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Staff list will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>{terminology.matches}</CardTitle>
              <CardDescription>
                View the {terminology.club.toLowerCase()}&apos;s schedule here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Schedule will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
