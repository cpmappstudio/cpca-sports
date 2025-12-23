import { BasketballTeamsTable } from "@/components/sections/shell/sports/basketball/teams-table";
import { SoccerTeamsTable } from "@/components/sections/shell/sports/soccer/teams-table";

interface TeamsPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { tenant } = await params;

  // TODO: Replace with actual Convex query when implemented
  // const [leagueData, teamsData] = await Promise.all([
  //   preloadQuery(api.leagues.getBySlug, { slug: tenant }),
  //   preloadQuery(api.clubs.listByLeagueSlug, { leagueSlug: tenant }),
  // ]);

  // Mock data for now - replace with actual sportType detection
  const sportType = "basketball"; // or "soccer"

  // Mock preloaded data
  const mockTeamsData = [] as any;

  if (sportType === "basketball") {
    return (
      <BasketballTeamsTable preloadedData={mockTeamsData} orgSlug={tenant} />
    );
  }

  if (sportType === "soccer") {
    return <SoccerTeamsTable preloadedData={mockTeamsData} orgSlug={tenant} />;
  }

  return <div>Unsupported sport type</div>;
}
