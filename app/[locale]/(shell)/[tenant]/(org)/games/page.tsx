import { GamesTable } from "@/components/sections/shell/tournaments/games-table";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

interface GamesPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function GamesPage({ params }: GamesPageProps) {
  const { tenant } = await params;

  const preloadedGames = await preloadQuery(api.games.listByLeagueSlug, {
    leagueSlug: tenant,
  });

  return <GamesTable preloadedGames={preloadedGames} orgSlug={tenant} />;
}
