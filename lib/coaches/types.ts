import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type CoachListItem = FunctionReturnType<
  typeof api.coaches.listByOrganization
>[number];
export type CoachDetail = NonNullable<
  FunctionReturnType<typeof api.coaches.getById>
>;
export type CoachActivity = NonNullable<
  FunctionReturnType<typeof api.coachActivities.getById>
>;
export type CoachActivityListItem = FunctionReturnType<
  typeof api.coachActivities.listOpenByCoach
>["page"][number];

export type CoachActivitySort = NonNullable<
  FunctionArgs<typeof api.coachActivities.listOpenByCoach>["sort"]
>;

export type CoachActivityDateRange = FunctionArgs<
  typeof api.coachActivities.getPeriodByCoach
>["range"];
export type CoachActivityPeriodPreset =
  "all" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";
export type CoachActivityPeriod = FunctionReturnType<
  typeof api.coachActivities.getPeriodByCoach
>;

export type CoachActivityPeriodSelection = {
  preset: CoachActivityPeriodPreset;
  range: CoachActivityDateRange | null;
};

export type CoachActivityReportSnapshot = {
  coach: { name: string; program: string; position: string };
  range: CoachActivityDateRange;
  period: Extract<CoachActivityPeriod, { status: "ready" }>;
  locale: string;
  generatedAt: number;
};

export type CoachActivityReportTranslate = (
  key:
    | `report.${keyof (typeof import("@/messages/en/coaches.json"))["report"]}`
    | `detail.${keyof (typeof import("@/messages/en/coaches.json"))["detail"]}`,
  values?: Record<string, string | number>,
) => string;
