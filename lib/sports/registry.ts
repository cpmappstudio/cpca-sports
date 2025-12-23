import { soccerConfig } from "./soccer/config";
import { basketballConfig } from "./basketball/config";
import type { SportConfig, SportType } from "./types";

export const SPORTS_REGISTRY: Record<SportType, SportConfig> = {
  soccer: soccerConfig,
  basketball: basketballConfig,
} as const;

export function getSportConfig(sportType: SportType): SportConfig {
  return SPORTS_REGISTRY[sportType];
}

export function getAllSports(): SportConfig[] {
  return Object.values(SPORTS_REGISTRY);
}

export function getSportTypes(): SportType[] {
  return Object.keys(SPORTS_REGISTRY) as SportType[];
}
