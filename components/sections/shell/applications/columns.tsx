"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { Application } from "../../../../lib/applications/types";
import type { FilterConfig } from "@/lib/table/types";

function useStatusMap() {
  const t = useTranslations("Applications.statusOptions");
  return {
    pending: { label: t("pending"), variant: "outline" as const },
    approved: { label: t("approved"), variant: "default" as const },
    rejected: { label: t("rejected"), variant: "destructive" as const },
    under_review: { label: t("under_review"), variant: "secondary" as const },
  };
}

export function useAdminApplicationColumns(): ColumnDef<Application>[] {
  const t = useTranslations("Applications");
  const statusMap = useStatusMap();

  return [
    {
      accessorKey: "createdAt",
      header: () => <div className="hidden md:block">{t("date")}</div>,
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt") as string);
        return (
          <div className="hidden md:block">
            {date.toLocaleDateString("en-EN")}
          </div>
        );
      },
    },
    {
      accessorKey: "firstName",
      header: t("athlete"),
      cell: ({ row }) => {
        const firstName = row.getValue("firstName") as string;
        const lastName = row.original.lastName;
        const program = row.original.program;
        const grade = row.original.gradeEntering;
        const status = row.original.status as keyof typeof statusMap;
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
      accessorKey: "program",
      header: () => <div className="hidden lg:block">{t("program")}</div>,
      cell: ({ row }) => (
        <div className="hidden lg:block capitalize">
          {row.getValue("program")}
        </div>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "gradeEntering",
      header: () => <div className="hidden lg:block">{t("grade")}</div>,
      cell: ({ row }) => (
        <div className="hidden lg:block text-sm">
          {row.getValue("gradeEntering")}
        </div>
      ),
    },
    {
      accessorKey: "parent1FirstName",
      header: t("parent"),
      cell: ({ row }) => {
        const firstName = row.getValue("parent1FirstName") as string;
        const lastName = row.original.parent1LastName;
        const telephone = row.original.parent1Telephone;
        const email = row.original.parent1Email;

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
      accessorKey: "parent1Telephone",
      header: () => <div className="hidden lg:block">{t("contact")}</div>,
      cell: ({ row }) => {
        const telephone = row.getValue("parent1Telephone") as string;
        const email = row.original.parent1Email;
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
        const status = row.getValue("status") as keyof typeof statusMap;
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
      accessorKey: "createdAt",
      header: () => <div className="hidden md:block">{t("date")}</div>,
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt") as string);
        return (
          <div className="hidden md:block">
            {date.toLocaleDateString("en-EN")}
          </div>
        );
      },
    },
    {
      accessorKey: "firstName",
      header: t("athlete"),
      cell: ({ row }) => {
        const firstName = row.getValue("firstName") as string;
        const lastName = row.original.lastName;
        const program = row.original.program;
        const grade = row.original.gradeEntering;

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
      accessorKey: "program",
      header: () => <div className="hidden md:block">{t("program")}</div>,
      cell: ({ row }) => (
        <div className="hidden md:block capitalize">
          {row.getValue("program")}
        </div>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "gradeEntering",
      header: () => <div className="hidden md:block">{t("grade")}</div>,
      cell: ({ row }) => (
        <div className="hidden md:block text-sm">
          {row.getValue("gradeEntering")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as keyof typeof statusMap;
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
        { value: "under_review", label: tStatus("under_review") },
        { value: "approved", label: tStatus("approved") },
        { value: "rejected", label: tStatus("rejected") },
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
