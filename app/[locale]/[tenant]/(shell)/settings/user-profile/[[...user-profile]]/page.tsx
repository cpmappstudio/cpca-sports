import { SecuritySettings } from "@/components/sections/shell/settings/security-settings";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const token = await getAuthToken();
  const coachId = await fetchQuery(
    api.coaches.getMine,
    { organizationSlug: tenant },
    { token },
  );

  return <SecuritySettings coachRestricted={Boolean(coachId)} />;
}
