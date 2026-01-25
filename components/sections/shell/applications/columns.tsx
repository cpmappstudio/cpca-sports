"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { Application, ApplicationStatus } from "@/lib/applications/types";
import { getFormField } from "@/lib/applications/types";
import type { FilterConfig } from "@/lib/table/types";

function useStatusMap() {
  const t = useTranslations("Applications.statusOptions");
  return {
    pending: { label: t("pending"), variant: "outline" as const },
    reviewing: { label: t("reviewing"), variant: "secondary" as const },
    "pre-admitted": { label: t("pre-admitted"), variant: "default" as const },
    admitted: { label: t("admitted"), variant: "default" as const },
    denied: { label: t("denied"), variant: "destructive" as const },
  };
}

export function useAdminApplicationColumns(): ColumnDef<Application>[] {
  const t = useTranslations("Applications");
  const statusMap = useStatusMap();

  return [
    {
      accessorKey: "_creationTime",
      header: () => <div className="hidden md:block">{t("date")}</div>,
      cell: ({ row }) => {
        const date = new Date(row.getValue("_creationTime") as number);
        return (
          <div className="hidden md:block">
            {date.toLocaleDateString("en-EN")}
          </div>
        );
      },
    },
    {
      id: "athlete",
      header: t("athlete"),
      accessorFn: (row) => getFormField(row.formData, "athlete", "firstName"),
      cell: ({ row }) => {
        const { formData, status } = row.original;
        const firstName = getFormField(formData, "athlete", "firstName");
        const lastName = getFormField(formData, "athlete", "lastName");
        const program = getFormField(formData, "athlete", "program");
        const grade = getFormField(formData, "athlete", "gradeEntering");
        const statusInfo = statusMap[status];

        return (
          <div>
            <div className="font-medium">
              {firstName} {lastName}
            </div>
            <div className="lg:hidden flex flex-col gap-0.5 mt-1">
              <span className="text-xs text-muted-foreground capitalize">
                {program}
              </span>
              {grade && (
                <span className="text-xs text-muted-foreground">{grade}</span>
              )}
              <Badge
                variant={statusInfo.variant}
                className="sm:hidden text-xs w-fit mt-1"
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      id: "program",
      header: () => <div className="hidden lg:block">{t("program")}</div>,
      accessorFn: (row) => getFormField(row.formData, "athlete", "program"),
      cell: ({ row }) => (
        <div className="hidden lg:block capitalize">
          {getFormField(row.original.formData, "athlete", "program")}
        </div>
      ),
      filterFn: (row, id, value) => {
        const program = getFormField(
          row.original.formData,
          "athlete",
          "program",
        );
        return value.includes(program);
      },
    },
    {
      id: "gradeEntering",
      header: () => <div className="hidden lg:block">{t("grade")}</div>,
      accessorFn: (row) =>
        getFormField(row.formData, "athlete", "gradeEntering"),
      cell: ({ row }) => (
        <div className="hidden lg:block text-sm">
          {getFormField(row.original.formData, "athlete", "gradeEntering")}
        </div>
      ),
    },
    {
      id: "parent",
      header: t("parent"),
      accessorFn: (row) =>
        getFormField(row.formData, "parents", "parent1FirstName"),
      cell: ({ row }) => {
        const { formData } = row.original;
        const firstName = getFormField(formData, "parents", "parent1FirstName");
        const lastName = getFormField(formData, "parents", "parent1LastName");
        const telephone = getFormField(formData, "parents", "parent1Telephone");
        const email = getFormField(formData, "parents", "parent1Email");

        return firstName ? (
          <div>
            <div className="text-sm">
              {firstName} {lastName}
            </div>
            <div className="lg:hidden text-xs text-muted-foreground mt-0.5">
              {telephone}
            </div>
            <div className="lg:hidden text text-muted-foreground mt-0.5">
              {email}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">-</div>
        );
      },
    },
    {
      id: "contact",
      header: () => <div className="hidden lg:block">{t("contact")}</div>,
      cell: ({ row }) => {
        const { formData } = row.original;
        const telephone = getFormField(formData, "parents", "parent1Telephone");
        const email = getFormField(formData, "parents", "parent1Email");
        return (
          <div className="hidden lg:flex lg:flex-col font-medium">
            <div>{telephone}</div>
            <div className="text-muted-foreground">{email}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="hidden sm:block">{t("status")}</div>,
      cell: ({ row }) => {
        const status = row.getValue("status") as ApplicationStatus;
        const statusInfo = statusMap[status];

        return (
          <div className="hidden sm:block">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
  ];
}

export function useClientApplicationColumns(): ColumnDef<Application>[] {
  const t = useTranslations("Applications");
  const statusMap = useStatusMap();

  return [
    {
      accessorKey: "_creationTime",
      header: () => <div className="hidden md:block">{t("date")}</div>,
      cell: ({ row }) => {
        const date = new Date(row.getValue("_creationTime") as number);
        return (
          <div className="hidden md:block">
            {date.toLocaleDateString("en-EN")}
          </div>
        );
      },
    },
    {
      id: "athlete",
      header: t("athlete"),
      accessorFn: (row) => getFormField(row.formData, "athlete", "firstName"),
      cell: ({ row }) => {
        const { formData } = row.original;
        const firstName = getFormField(formData, "athlete", "firstName");
        const lastName = getFormField(formData, "athlete", "lastName");
        const program = getFormField(formData, "athlete", "program");
        const grade = getFormField(formData, "athlete", "gradeEntering");

        return (
          <div>
            <div className="font-medium">
              {firstName} {lastName}
            </div>
            <div className="md:hidden flex flex-col gap-0.5 mt-1">
              <span className="text-xs text-muted-foreground capitalize">
                {program}
              </span>
              {grade && (
                <span className="text-xs text-muted-foreground">{grade}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "program",
      header: () => <div className="hidden md:block">{t("program")}</div>,
      accessorFn: (row) => getFormField(row.formData, "athlete", "program"),
      cell: ({ row }) => (
        <div className="hidden md:block capitalize">
          {getFormField(row.original.formData, "athlete", "program")}
        </div>
      ),
      filterFn: (row, id, value) => {
        const program = getFormField(
          row.original.formData,
          "athlete",
          "program",
        );
        return value.includes(program);
      },
    },
    {
      id: "gradeEntering",
      header: () => <div className="hidden md:block">{t("grade")}</div>,
      accessorFn: (row) =>
        getFormField(row.formData, "athlete", "gradeEntering"),
      cell: ({ row }) => (
        <div className="hidden md:block text-sm">
          {getFormField(row.original.formData, "athlete", "gradeEntering")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as ApplicationStatus;
        const statusInfo = statusMap[status];

        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
  ];
}

export function useApplicationFilters(): FilterConfig[] {
  const t = useTranslations("Applications");
  const tStatus = useTranslations("Applications.statusOptions");
  const tPrograms = useTranslations("Applications.programs");

  return [
    {
      id: "status",
      label: t("status"),
      options: [
        { value: "pending", label: tStatus("pending") },
        { value: "reviewing", label: tStatus("reviewing") },
        { value: "pre-admitted", label: tStatus("pre-admitted") },
        { value: "admitted", label: tStatus("admitted") },
        { value: "denied", label: tStatus("denied") },
      ],
    },
    {
      id: "program",
      label: t("program"),
      options: [
        { value: "basketball", label: tPrograms("basketball") },
        { value: "soccer", label: tPrograms("soccer") },
        { value: "volleyball", label: tPrograms("volleyball") },
        { value: "baseball", label: tPrograms("baseball") },
        { value: "tennis", label: tPrograms("tennis") },
      ],
    },
  ];
}
