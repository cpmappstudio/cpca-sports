import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import { COACH_ACTIVITY_TIME_ZONE } from "@/convex/lib/coachActivityTime";
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
  const tableBody: TableCell[][] = [
    (
      [
        "detail.activityColumn",
        "detail.placeColumn",
        "detail.entry",
        "detail.exit",
        "detail.duration",
        "report.status",
      ] as const
    ).map((key) => ({
      text: t(key),
      bold: true,
      color: "#ffffff",
      fillColor: "#08469d",
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
    tableBody.push([
      { text: activity.title, bold: true },
      activity.placeName,
      activity.checkInOrder === null
        ? t("report.notRecorded")
        : formatActivityTimestamp(activity.checkInOrder, locale),
      activity.checkOutOrder === null
        ? t("report.notRecorded")
        : formatActivityTimestamp(activity.checkOutOrder, locale),
      {
        text: open ? t("report.pending") : duration(activity.durationMs),
        alignment: "right",
      },
      t(
        open
          ? "detail.inProgress"
          : activity.durationMs === null
            ? "report.incomplete"
            : "report.completed",
      ),
    ]);
  }
  if (!activities.length)
    tableBody.push([
      {
        text: t("report.empty"),
        colSpan: 6,
        alignment: "center",
        margin: [0, 18, 0, 18],
      },
      {},
      {},
      {},
      {},
      {},
    ]);
  const exclusions: Content[] = [];
  if (summary.pendingCount)
    exclusions.push({
      text: t("report.pendingExcluded", { count: summary.pendingCount }),
      margin: [0, 3, 0, 0],
    });
  if (summary.unknownDurationCount)
    exclusions.push({
      text: t("report.unknownExcluded", {
        count: summary.unknownDurationCount,
      }),
      margin: [0, 3, 0, 0],
    });
  return {
    pageSize: "LETTER",
    pageOrientation: "landscape",
    pageMargins: [32, 88, 32, 55],
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
    header: {
      columns: [
        { image: "cpcaLogo", fit: [56, 56], width: 56, alignment: "left" },
      ],
      margin: [32, 16, 32, 0],
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
      margin: [32, 20, 32, 0],
    }),
    content: [
      {
        text: t("report.title"),
        fontSize: 23,
        bold: true,
        margin: [0, 0, 0, 12],
      },
      {
        columns: [
          {
            width: "55%",
            stack: [
              { text: coach.name, fontSize: 14, bold: true },
              {
                text: `${coach.program} · ${coach.position}`,
                margin: [0, 4, 0, 0],
                color: "#596b83",
              },
            ],
          },
          {
            width: "45%",
            stack: [
              {
                text: `${formatActivityDate(range.from, locale)} - ${formatActivityDate(range.to, locale)}`,
                bold: true,
              },
              {
                text: t("detail.timeZoneNotice", {
                  timeZone: COACH_ACTIVITY_TIME_ZONE,
                }),
                margin: [0, 4, 0, 0],
                color: "#596b83",
              },
            ],
          },
        ],
        columnGap: 20,
        margin: [0, 0, 0, 12],
      },
      {
        unbreakable: true,
        table: {
          widths: ["*", 218],
          body: [
            [
              {
                stack: [
                  {
                    text: t("report.recordedTime"),
                    fontSize: 9,
                    color: "#596b83",
                  },
                  {
                    text:
                      includedCount || !summary.activityCount
                        ? duration(summary.totalDurationMs, true)
                        : t("detail.durationUnavailable"),
                    fontSize: 24,
                    bold: true,
                    margin: [0, 4, 0, 6],
                  },
                  {
                    text: t("report.includedCount", {
                      included: includedCount,
                      total: summary.activityCount,
                    }),
                    fontSize: 9,
                    color: "#596b83",
                  },
                ],
                fillColor: "#edf3fc",
              },
              {
                stack: [
                  {
                    text: t("detail.periodActivities"),
                    fontSize: 9,
                    color: "#596b83",
                  },
                  {
                    text: new Intl.NumberFormat(locale).format(
                      summary.activityCount,
                    ),
                    fontSize: 20,
                    bold: true,
                    margin: [0, 4, 0, 0],
                  },
                ],
                fillColor: "#edf3fc",
              },
            ],
            ...(exclusions.length
              ? [
                  [
                    {
                      colSpan: 2,
                      stack: [
                        {
                          text: t("report.excludedTitle"),
                          bold: true,
                          color: "#172b46",
                        },
                        ...exclusions,
                      ],
                      fontSize: 9,
                      color: "#596b83",
                      fillColor: "#ffffff",
                    },
                    {},
                  ],
                ]
              : []),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#dce3ec",
          vLineColor: () => "#dce3ec",
          paddingTop: () => 10,
          paddingBottom: () => 10,
          paddingLeft: () => 12,
          paddingRight: () => 12,
        },
        margin: [0, 0, 0, 10],
      },
      {
        text: t("report.activities"),
        fontSize: 12,
        bold: true,
        margin: [0, 12, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: ["32%", "13%", "16%", "16%", "10%", "13%"],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#dce3ec",
          fillColor: (i) => (i > 0 && i % 2 === 0 ? "#f5f7fb" : null),
          paddingTop: () => 9,
          paddingBottom: () => 9,
          paddingLeft: () => 7,
          paddingRight: () => 7,
        },
        fontSize: 9,
      },
    ],
  };
}
