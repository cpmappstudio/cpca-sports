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
