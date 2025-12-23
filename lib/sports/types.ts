import type { Doc } from "@/convex/_generated/dataModel";

export type SportType = "soccer" | "basketball";

export interface SportConfig {
  id: SportType;
  positions: readonly string[];
  playerStatFields: readonly string[];
  standingsStatFields: readonly string[];
  defaultMatchDuration: number;
  pointsForWin: number;
  pointsForDraw: number | null;
  features: {
    hasCategories: boolean;
    hasConferences: boolean;
    hasPromotionRelegation: boolean;
  };
}

export function isSoccerPlayer(
  player: Doc<"players">,
): player is Doc<"players"> & { sportType: "soccer" } {
  return player.sportType === "soccer";
}

export function isBasketballPlayer(
  player: Doc<"players">,
): player is Doc<"players"> & { sportType: "basketball" } {
  return player.sportType === "basketball";
}

export function isSoccerLeague(
  league: Doc<"leagues">,
): league is Doc<"leagues"> & { sportType: "soccer" } {
  return league.sportType === "soccer";
}

export function isBasketballLeague(
  league: Doc<"leagues">,
): league is Doc<"leagues"> & { sportType: "basketball" } {
  return league.sportType === "basketball";
}
