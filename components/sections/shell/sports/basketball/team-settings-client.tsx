"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowLeft } from "lucide-react";
import { ROUTES } from "@/lib/navigation/routes";
import { TeamGeneralForm } from "./team-settings/team-general-form";
import { TeamPlayersTable } from "./team-settings/team-players-table";
import { TeamStaffTable } from "./team-settings/team-staff-table";

interface TeamSettingsClientProps {
  preloadedTeam: Preloaded<typeof api.clubs.getBySlug>;
  preloadedPlayers: Preloaded<
    typeof api.players.listBasketballPlayersByClubSlug
  >;
  orgSlug: string;
}

export function TeamSettingsClient({
  preloadedTeam,
  preloadedPlayers,
  orgSlug,
}: TeamSettingsClientProps) {
  const t = useTranslations("Common");
  const team = usePreloadedQuery(preloadedTeam);
  const playersData = usePreloadedQuery(preloadedPlayers);

  if (team === null) {
    return (
      <div className="p-4 md:p-6">
        <Heading>{t("errors.notFound")}</Heading>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={ROUTES.org.teams.detail(orgSlug, team.slug)}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <Text className="text-muted-foreground text-sm">
            {t("actions.settings")}
          </Text>
          <Heading level={2}>{team.name}</Heading>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">{t("settings.general")}</TabsTrigger>
          <TabsTrigger value="players">{t("players.title")}</TabsTrigger>
          <TabsTrigger value="staff">{t("staff.title")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.general")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamGeneralForm team={team} orgSlug={orgSlug} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          <TeamPlayersTable
            players={playersData?.players ?? []}
            clubSlug={team.slug}
            orgSlug={orgSlug}
          />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <TeamStaffTable clubSlug={team.slug} orgSlug={orgSlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
