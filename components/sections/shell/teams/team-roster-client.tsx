"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TeamPlayersTable } from "@/components/sections/shell/sports/basketball/team-settings/team-players-table";

interface TeamRosterClientProps {
  preloadedPlayers: Preloaded<
    typeof api.players.listBasketballPlayersByClubSlug
  >;
  clubSlug: string;
  orgSlug: string;
}

export function TeamRosterClient({
  preloadedPlayers,
  clubSlug,
  orgSlug,
}: TeamRosterClientProps) {
  const playersData = usePreloadedQuery(preloadedPlayers);

  return (
    <TeamPlayersTable
      players={playersData?.players ?? []}
      clubSlug={clubSlug}
      orgSlug={orgSlug}
    />
  );
}
