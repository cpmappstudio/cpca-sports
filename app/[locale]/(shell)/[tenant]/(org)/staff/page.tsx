import { LeagueStaffClient } from "@/components/sections/shell/organizations/league-staff-client";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

type Params = Promise<{
  locale: string;
  tenant: string;
}>;

export default async function LeagueStaffPage({ params }: { params: Params }) {
  const { tenant } = await params;

  const preloadedStaff = await preloadQuery(api.staff.listAllByLeagueSlug, {
    leagueSlug: tenant,
  });

  return (
    <LeagueStaffClient preloadedStaff={preloadedStaff} leagueSlug={tenant} />
  );
}
