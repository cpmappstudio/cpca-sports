import { TournamentsTable } from "@/components/sections/shell/tournaments/tournaments-table";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

interface TournamentsPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function TournamentsPage({
  params,
}: TournamentsPageProps) {
  const { tenant } = await params;

  const preloadedTournaments = await preloadQuery(
    api.tournaments.listByLeagueSlug,
    {
      leagueSlug: tenant,
    },
  );

  return (
    <TournamentsTable preloadedData={preloadedTournaments} orgSlug={tenant} />
  );
}
