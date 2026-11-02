import type { ApplicationListItem } from "./list-types";
import type { ApplicationStatus } from "./types";
import { formatApplicationDate } from "@/components/sections/shell/applications/date-format";

export function getApplicationAccountName(row: ApplicationListItem) {
  return (
    `${row.account.firstName} ${row.account.lastName}`.trim() ||
    row.account.email ||
    "-"
  );
}

export function getApplicationPaymentProgress(
  summary: ApplicationListItem["paymentSummary"],
) {
  if (summary.totalDue <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, (summary.totalPaid / summary.totalDue) * 100),
  );
}

export function formatApplicationTableValue(
  value: string | number | boolean | null | undefined,
  copy: { yes: string; no: string; missing: string },
) {
  if (value === undefined) return "…";
  if (value === null) return copy.missing;
  if (typeof value === "boolean") return value ? copy.yes : copy.no;
  return String(value);
}

export function getApplicationFieldSortValue(
  row: ApplicationListItem,
  columnId: string,
) {
  const dateValue = row.formSortValues?.[columnId];
  const value =
    dateValue !== undefined ? dateValue : row.formValues?.[columnId];
  if (
    value == null ||
    value === "—" ||
    (typeof value === "string" && !value.trim())
  )
    return undefined;
  return typeof value === "boolean" ? Number(value) : value;
}

export function compareApplicationTableValues(
  left: string | number | undefined,
  right: string | number | undefined,
  locale: string,
) {
  if (typeof left === "number" && typeof right === "number")
    return left - right;
  return String(left ?? "").localeCompare(String(right ?? ""), locale, {
    numeric: true,
    sensitivity: "base",
  });
}

interface ApplicationTableExportOptions {
  labels: Record<string, string>;
  locale: string;
  statuses: Record<ApplicationStatus, string>;
  yes: string;
  no: string;
  missing: string;
  noFees: string;
}

export function convertApplicationsToCSV(
  rows: ApplicationListItem[],
  columnIds: string[],
  options: ApplicationTableExportOptions,
) {
  if (!columnIds.length) return "";
  const values = rows.map((row) => {
    const base: Record<string, string> = {
      _creationTime: formatApplicationDate(row._creationTime, options.locale),
      fullName: `${row.applicant.firstName} ${row.applicant.lastName}`.trim(),
      program: row.program.name,
      enrollmentYear: row.enrollmentYear ?? "",
      contact: [getApplicationAccountName(row), row.applicant.telephone]
        .filter(Boolean)
        .join(" · "),
      paymentProgress:
        row.paymentSummary.feeCount > 0
          ? `${Math.round(getApplicationPaymentProgress(row.paymentSummary))}%`
          : options.noFees,
      status: options.statuses[row.status],
    };
    return columnIds.map((id) =>
      id.startsWith("form:")
        ? formatApplicationTableValue(row.formValues?.[id], options)
        : (base[id] ?? ""),
    );
  });
  return [columnIds.map((id) => options.labels[id] ?? id), ...values]
    .map((row) =>
      row
        .map(
          (value) =>
            `"${String(value)
              .replace(/^(?=\s*[=+@-])/, "'")
              .replace(/"/g, '""')}"`,
        )
        .join(","),
    )
    .join("\n");
}
