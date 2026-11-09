import { v, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { legacyActivityTimestamp } from "./coachActivityTime";

export const activitySortValidator = v.object({
  field: v.union(
    v.literal("title"),
    v.literal("placeName"),
    v.literal("checkIn"),
    v.literal("checkOut"),
  ),
  direction: v.union(v.literal("asc"), v.literal("desc")),
});
type ActivitySort = Infer<typeof activitySortValidator>;

export const activityListingValidator = v.object({
  group: v.union(v.literal("open"), v.literal("history")),
  title: v.string(),
  place: v.string(),
  checkInOrder: v.optional(v.union(v.number(), v.null())),
  checkOutOrder: v.optional(v.union(v.number(), v.null())),
  // Accept existing index metadata until every deployment has run the backfill.
  checkOutDate: v.optional(v.string()),
});

export function coachActivityListing(
  activity: Pick<
    Doc<"coachActivities">,
    | "status"
    | "title"
    | "placeName"
    | "activityDate"
    | "startTime"
    | "checkInAt"
    | "checkOutAt"
    | "endTime"
  >,
): Infer<typeof activityListingValidator> {
  const legacy =
    activity.checkInAt === undefined && activity.checkOutAt === undefined;
  return {
    group: activity.status === "in_progress" ? "open" : "history",
    title: activity.title.trim().toLowerCase(),
    place: activity.placeName.trim().toLowerCase(),
    checkInOrder:
      activity.checkInAt ??
      (legacy
        ? legacyActivityTimestamp(activity.activityDate, activity.startTime)
        : null),
    checkOutOrder:
      activity.checkOutAt ??
      (legacy
        ? legacyActivityTimestamp(activity.activityDate, activity.endTime)
        : null),
  };
}

export function sortedCoachActivities(
  ctx: QueryCtx,
  coachId: Doc<"coaches">["_id"],
  group: "open" | "history",
  sort: ActivitySort,
) {
  const activities = ctx.db.query("coachActivities");
  switch (sort.field) {
    case "title":
      return activities
        .withIndex("by_coachId_listing_group_listing_title", (q) =>
          q.eq("coachId", coachId).eq("listing.group", group),
        )
        .order(sort.direction);
    case "placeName":
      return activities
        .withIndex("by_coachId_listing_group_listing_place", (q) =>
          q.eq("coachId", coachId).eq("listing.group", group),
        )
        .order(sort.direction);
    case "checkIn":
      return activities
        .withIndex("by_coachId_listing_group_listing_checkInOrder", (q) =>
          q.eq("coachId", coachId).eq("listing.group", group),
        )
        .order(sort.direction);
    case "checkOut":
      return activities
        .withIndex("by_coachId_listing_group_listing_checkOutOrder", (q) =>
          q.eq("coachId", coachId).eq("listing.group", group),
        )
        .order(sort.direction);
  }
}

export function publicCoachActivity(
  activity: Doc<"coachActivities">,
): Omit<Doc<"coachActivities">, "listing"> {
  const record = { ...activity };
  delete record.listing;
  return record;
}
