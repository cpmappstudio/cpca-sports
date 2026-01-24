"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LeagueStaffTable } from "@/components/sections/shell/organizations/league-staff-table";

interface LeagueStaffClientProps {
  preloadedStaff: Preloaded<typeof api.staff.listAllByLeagueSlug>;
  leagueSlug: string;
}

export function LeagueStaffClient({
  preloadedStaff,
  leagueSlug,
}: LeagueStaffClientProps) {
  usePreloadedQuery(preloadedStaff);

  return <LeagueStaffTable leagueSlug={leagueSlug} />;
}
