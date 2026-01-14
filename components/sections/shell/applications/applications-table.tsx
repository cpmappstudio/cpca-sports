"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/table/data-table";
import {
  useAdminApplicationColumns,
  useClientApplicationColumns,
  useApplicationFilters,
} from "@/components/sections/shell/applications/columns";
import { ROUTES } from "@/lib/navigation/routes";
import type { Application } from "@/lib/applications/types";

interface ApplicationsTableProps {
  applications: Application[];
  organizationSlug: string;
  isAdmin: boolean;
}

export function ApplicationsTable({
  applications,
  organizationSlug,
  isAdmin,
}: ApplicationsTableProps) {
  const router = useRouter();
  const t = useTranslations("Applications");
  const tTable = useTranslations("Common.table");
  const tActions = useTranslations("Common.actions");
  const adminColumns = useAdminApplicationColumns();
  const clientColumns = useClientApplicationColumns();
  const filters = useApplicationFilters();

  const handleRowClick = (application: Application) => {
    router.push(
      ROUTES.org.applications.detail(organizationSlug, application._id)
    );
  };

  const handleCreate = () => {
    router.push(ROUTES.org.applications.create(organizationSlug));
  };

  const handleExport = isAdmin
    ? (rows: Application[]) => {
        const csv = convertToCSV(rows, t);
        downloadCSV(
          csv,
          `applications-${organizationSlug}-${new Date().toISOString().split("T")[0]}.csv`
        );
      }
    : undefined;

  return (
    <DataTable
      data={applications}
      columns={isAdmin ? adminColumns : clientColumns}
      filterColumn="firstName"
      filterPlaceholder={t("searchPlaceholder")}
      emptyMessage={
        isAdmin ? t("emptyMessageAdmin") : t("emptyMessageClient")
      }
      columnsMenuLabel={tTable("columns")}
      exportButtonLabel={tActions("export")}
      filtersMenuLabel={tTable("filters")}
      filterConfigs={isAdmin ? filters : undefined}
      initialSorting={[{ id: "createdAt", desc: true }]}
      onCreate={!isAdmin ? handleCreate : undefined}
      onExport={handleExport}
      onRowClick={handleRowClick}
    />
  );
}

function convertToCSV(
  data: Application[],
  t: ReturnType<typeof useTranslations<"Applications">>
): string {
  if (data.length === 0) return "";

  const headers = [
    "Código",
    t("status"),
    "Nombre",
    "Apellido",
    "Email",
    "Teléfono",
    t("program"),
    t("grade"),
    "Fecha Nacimiento",
    "País",
    "Escuela Actual",
    "GPA",
    t("parent"),
    "Email Tutor",
    "Teléfono Tutor",
    "Fecha Creación",
  ];

  const rows = data.map((app) => [
    app.applicationCode,
    app.status,
    app.firstName,
    app.lastName,
    app.email,
    app.telephone,
    app.program,
    app.gradeEntering,
    app.birthDate,
    app.countryOfBirth,
    app.currentSchoolName,
    app.currentGPA,
    `${app.parent1FirstName} ${app.parent1LastName}`,
    app.parent1Email,
    app.parent1Telephone,
    new Date(app.createdAt).toLocaleDateString("es-ES"),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}

function downloadCSV(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
