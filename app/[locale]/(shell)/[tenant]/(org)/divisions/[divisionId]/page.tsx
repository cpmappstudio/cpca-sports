import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ConferenceDetailClient } from "@/components/sections/shell/sports/basketball/conferences";

interface ConferenceDetailPageProps {
  params: Promise<{
    tenant: string;
    divisionId: string;
  }>;
}

export default async function ConferenceDetailPage({
  params,
}: ConferenceDetailPageProps) {
  const { tenant, divisionId } = await params;

  // TODO: Replace with actual sportType detection from league data
  const sportType = "basketball";

  if (sportType === "basketball") {
    const preloadedConference = await preloadQuery(api.conferences.getBySlug, {
      slug: divisionId,
    });

    return (
      <ConferenceDetailClient
        preloadedConference={preloadedConference}
        orgSlug={tenant}
      />
    );
  }

  // For soccer, would show division detail instead
  return <div>Division detail for soccer</div>;
}
