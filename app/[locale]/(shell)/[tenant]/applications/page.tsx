import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ApplicationsTable } from "@/components/sections/shell/applications/applications-table";
import {
  IS_ADMIN,
  CURRENT_USER_ID,
  getApplicationsByRole,
} from "@/lib/applications/mocks";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ApplicationsPage({ params }: PageProps) {
  const { tenant } = await params;
  const t = await getTranslations("Applications.page");

  const applications = getApplicationsByRole(IS_ADMIN, CURRENT_USER_ID);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {IS_ADMIN ? t("titleAdmin") : t("titleClient")}
        </h1>
        <p className="text-muted-foreground">
          {IS_ADMIN ? t("descriptionAdmin") : t("descriptionClient")}
        </p>
      </div>

      <ApplicationsTable
        applications={applications}
        organizationSlug={tenant}
        isAdmin={IS_ADMIN}
      />
    </div>
  );
}
