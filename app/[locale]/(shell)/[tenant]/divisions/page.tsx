import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DivisionsTable } from "@/components/sections/shell/divisions/divisions-table";

interface DivisionsPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function DivisionsPage({ params }: DivisionsPageProps) {
  const { tenant } = await params;

  const preloadedData = await preloadQuery(api.divisions.listByLeagueSlug, {
    leagueSlug: tenant,
  });

  return <DivisionsTable preloadedData={preloadedData} orgSlug={tenant} />;
}
