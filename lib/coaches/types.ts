import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type CoachListItem = FunctionReturnType<
  typeof api.coaches.listByOrganization
>[number];
export type CoachDetail = NonNullable<
  FunctionReturnType<typeof api.coaches.getById>
>;
export type CoachActivity = FunctionReturnType<
  typeof api.coachActivities.listByCoach
>[number];
