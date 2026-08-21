import { SettingsLayout } from "@/components/layouts/settings-layout";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";

export default async function TenantSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const token = await getAuthToken();
  const coachId = await fetchQuery(
    api.coaches.getMine,
    { organizationSlug: tenant },
    { token },
  );
  return (
    <SettingsLayout
      context="org"
      orgSlug={tenant}
      allowedItemKeys={coachId ? ["profileSecurity", "appearance"] : undefined}
    >
      {children}
    </SettingsLayout>
  );
}
