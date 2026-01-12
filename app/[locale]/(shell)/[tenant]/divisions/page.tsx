import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DivisionsTable } from "@/components/sections/shell/divisions/divisions-table";
import { ConferencesTable } from "@/components/sections/shell/sports/basketball/conferences/conferences-table";

interface DivisionsPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function DivisionsPage({ params }: DivisionsPageProps) {
  const { tenant } = await params;

  // TODO: Replace with actual sportType detection from league data
  const sportType = "basketball";

  if (sportType === "basketball") {
    const preloadedConferences = await preloadQuery(
      api.conferences.listByLeague,
      {
        leagueSlug: tenant,
      },
    );

    return (
      <ConferencesTable preloadedData={preloadedConferences} orgSlug={tenant} />
    );
  }

  const preloadedData = await preloadQuery(api.divisions.listByLeagueSlug, {
    leagueSlug: tenant,
  });

  return <DivisionsTable preloadedData={preloadedData} orgSlug={tenant} />;
}
