import CpcaHeader from "@/components/common/cpca-header";
import { PreAdmissionForm } from "@/components/sections/shell/preadmission/preadmission-form";
import { getTranslations } from "next-intl/server";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/navigation/routes";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function PreadmissionPage({ params }: PageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();
  const t = await getTranslations("preadmission");

  const preloadedCoach = await preloadQuery(
    api.coaches.getMine,
    { organizationSlug: tenant },
    { token },
  );
  const coachId = preloadedQueryResult(preloadedCoach);
  if (coachId) {
    redirect(ROUTES.org.coaches.detail(tenant, coachId));
  }

  const [preloadedOrganization, preloadedPrograms] = await Promise.all([
    preloadQuery(api.organizations.getBySlug, { slug: tenant }, { token }),
    preloadQuery(
      api.programs.listForApplication,
      { organizationSlug: tenant },
      { token },
    ),
  ]);
  const organization = preloadedQueryResult(preloadedOrganization);
  const programs = preloadedQueryResult(preloadedPrograms);

  return (
    <>
      <CpcaHeader
        title={t("title")}
        subtitle={t("description")}
        logoUrl={organization?.imageUrl}
      />
      <PreAdmissionForm organizationSlug={tenant} programs={programs} />
    </>
  );
}
