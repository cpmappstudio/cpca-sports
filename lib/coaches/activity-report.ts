import type { TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { COACH_ACTIVITY_TIME_ZONE } from "@/convex/lib/coachActivityTime";
import { isAwaitingActivityReconciliation } from "@/convex/lib/coachActivityClosure";
import { formatActivityDate } from "./activity-period";
import {
  formatActivityTimestamp,
  formatActivityDuration,
} from "./activity-time";
import type {
  CoachActivityReportSnapshot,
  CoachActivityReportTranslate,
} from "./types";

export function buildActivityReport(
  snapshot: CoachActivityReportSnapshot,
  t: CoachActivityReportTranslate,
  logo: string,
): TDocumentDefinitions {
  const { coach, range, period, locale, generatedAt } = snapshot;
  const { summary } = period;
  const includedCount =
    summary.activityCount - summary.pendingCount - summary.unknownDurationCount;
  const duration = (ms: number | null, total = false) =>
    formatActivityDuration(
      ms,
      (key, values) => t(`detail.${key}`, values),
      total,
    );
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: COACH_ACTIVITY_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: COACH_ACTIVITY_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const timestampCell = (timestamp: number | null): TableCell =>
    timestamp === null
      ? t("report.notRecorded")
      : {
          stack: [
            dateFormatter.format(timestamp),
            timeFormatter.format(timestamp),
          ],
        };
  const tableBody: TableCell[][] = [
    (
      [
        "detail.activityColumn",
        "detail.placeColumn",
        "detail.entry",
        "detail.exit",
        "detail.duration",
      ] as const
    ).map((key) => ({
      text: t(key),
      bold: true,
      color: "#ffffff",
      fillColor: "#08469d",
      alignment: key === "detail.duration" ? "right" : "left",
    })),
  ];
  const activities = [...period.activities].sort(
    (a, b) =>
      a.activityDate.localeCompare(b.activityDate) ||
      (a.checkInOrder ?? 0) - (b.checkInOrder ?? 0) ||
      a._id.localeCompare(b._id),
  );
  for (const activity of activities) {
    const open = activity.status === "in_progress";
    const awaitingReconciliation = isAwaitingActivityReconciliation(activity);
    tableBody.push([
      { text: activity.title, bold: true },
      activity.placeName,
      timestampCell(activity.checkInOrder),
      awaitingReconciliation
        ? t("detail.pendingReconciliation")
        : open && activity.checkOutOrder === null
          ? t("report.pending")
          : timestampCell(activity.checkOutOrder),
      {
        text: open
          ? t("report.pending")
          : awaitingReconciliation
            ? t("detail.durationUndetermined")
            : duration(activity.durationMs),
        alignment: "right",
      },
    ]);
  }
  if (!activities.length)
    tableBody.push([
      {
        text: t("report.empty"),
        colSpan: 5,
        alignment: "center",
        margin: [0, 10, 0, 10],
      },
      {},
      {},
      {},
      {},
    ]);
  return {
    pageSize: "LETTER",
    pageOrientation: "portrait",
    pageMargins: [28, 20, 28, 40],
    images: { cpcaLogo: logo },
    info: {
      title: `${t("report.title")} - ${coach.name}`,
      author: "CPCA Sports",
      creationDate: new Date(generatedAt),
    },
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      color: "#172b46",
      lineHeight: 1.2,
    },
    footer: (page, pages) => ({
      columns: [
        {
          text: t("report.generated", {
            date: formatActivityTimestamp(generatedAt, locale),
          }),
          width: "*",
        },
        {
          text: t("report.page", { page, pages }),
          alignment: "right",
          width: "auto",
        },
      ],
      color: "#596b83",
      fontSize: 8,
      margin: [28, 12, 28, 0],
    }),
    content: [
      {
        table: {
          widths: [56, 238, 238],
          body: [
            [
              {
                image: "cpcaLogo",
                fit: [56, 56],
                width: 56,
                alignment: "left",
                verticalAlignment: "middle",
              },
              {
                verticalAlignment: "middle",
                stack: [
                  { text: coach.name, fontSize: 14, bold: true },
                  {
                    text: `${coach.program} · ${coach.position}`,
                    margin: [0, 3, 0, 0],
                    color: "#596b83",
                  },
                ],
              },
              {
                verticalAlignment: "middle",
                alignment: "right",
                stack: [
                  {
                    text: `${formatActivityDate(range.from, locale)} - ${formatActivityDate(range.to, locale)}`,
                    bold: true,
                  },
                  {
                    text: [
                      { text: `${t("report.recordedTime")}: ` },
                      {
                        text:
                          includedCount || !summary.activityCount
                            ? duration(summary.totalDurationMs, true)
                            : t("detail.durationUnavailable"),
                        bold: true,
                      },
                    ],
                    margin: [0, 3, 0, 0],
                  },
                  {
                    text: [
                      { text: `${t("detail.periodActivities")}: ` },
                      {
                        text: new Intl.NumberFormat(locale).format(
                          summary.activityCount,
                        ),
                        bold: true,
                      },
                    ],
                    margin: [0, 2, 0, 0],
                  },
                ],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
          paddingLeft: (index) => (index === 0 ? 0 : 12),
          paddingRight: () => 0,
        },
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ["36%", "14%", "19%", "19%", "12%"],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#004299",
          fillColor: (i) => (i > 0 && i % 2 === 0 ? "#f5f7fb" : null),
          paddingTop: () => 3,
          paddingBottom: () => 3,
          paddingLeft: () => 4,
          paddingRight: () => 4,
        },
        fontSize: 9,
        lineHeight: 1.1,
      },
    ],
  };
}
