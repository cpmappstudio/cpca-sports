import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery, preloadedQueryResult } from "convex/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";
import { CoachDetailView } from "@/components/sections/shell/coaches/coach-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string; coachId: string }>;
}) {
  const { tenant, coachId: value } = await params;
  const token = await getAuthToken();
  const [preloadedCoach, organization] = await Promise.all([
    preloadQuery(
      api.coaches.getById,
      { coachId: value as Id<"coaches">, organizationSlug: tenant },
      { token },
    ),
    fetchQuery(api.organizations.getBySlug, { slug: tenant }, { token }),
  ]);
  const coach = preloadedQueryResult(preloadedCoach);
  if (!coach) notFound();
  let programs: Array<{ _id: Id<"programs">; name: string }> = [];
  if (coach.isAdmin) {
    const query = await preloadQuery(
      api.programs.listByOrganization,
      { organizationId: coach.coach.organizationId },
      { token },
    );
    programs = preloadedQueryResult(query).map((program) => ({
      _id: program._id,
      name: program.name,
    }));
  }
  return (
    <CoachDetailView
      preloadedCoach={preloadedCoach}
      tenant={tenant}
      programs={programs}
      organizationLogoUrl={organization?.imageUrl}
    />
  );
}
