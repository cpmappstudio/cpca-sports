import { TournamentsTable } from "@/components/sections/shell/tournaments/tournaments-table";
import type { TournamentRow } from "@/components/sections/shell/tournaments/columns";

interface TournamentsPageProps {
    params: Promise<{
        tenant: string;
    }>;
}

export default async function TournamentsPage({ params }: TournamentsPageProps) {
    const { tenant } = await params;

    // TODO: Replace with actual Convex query when tournaments.ts is created
    // const preloadedData = await preloadQuery(api.tournaments.listByLeagueSlug, {
    //     leagueSlug: tenant,
    // });

    // Mock data for now
    const mockData: TournamentRow[] = [];

    return <TournamentsTable data={mockData} orgSlug={tenant} />;
}
