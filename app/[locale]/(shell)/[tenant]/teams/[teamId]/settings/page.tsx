import { TeamSettingsClient } from "@/components/sections/shell/sports/basketball/team-settings-client";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

interface TeamSettingsPageProps {
  params: Promise<{
    tenant: string;
    teamId: string;
  }>;
}

export default async function TeamSettingsPage({
  params,
}: TeamSettingsPageProps) {
  const { tenant, teamId } = await params;
  const preloadedTeam = await preloadQuery(api.clubs.getBySlug, {
    slug: teamId,
  });
  const preloadedPlayers = await preloadQuery(
    api.players.listBasketballPlayersByClubSlug,
    {
      clubSlug: teamId,
    },
  );

  return (
    <TeamSettingsClient
      preloadedTeam={preloadedTeam}
      preloadedPlayers={preloadedPlayers}
      orgSlug={tenant}
    />
  );
}
