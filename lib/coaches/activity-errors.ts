import { ConvexError } from "convex/values";

const errorKeys: Record<string, string> = {
  "Title is required": "titleRequired",
  "Invalid place": "invalidPlace",
  "Archived coaches cannot add activities": "coachArchived",
  "Coach already has an activity in progress": "activityInProgress",
  "Admin access required": "adminRequired",
  "Earlier activity times cannot be adjusted": "legacyTimeAdjustment",
  "Activity times have changed": "timesChanged",
  "Cannot add or remove checkout": "checkoutUnchanged",
  "Invalid activity time": "invalidTime",
  "Ambiguous activity time": "ambiguousTime",
  "Activity time cannot be in the future": "futureTime",
  "Checkout cannot precede check-in": "checkoutBeforeCheckin",
  "Activity not found": "activityNotFound",
  "Activity is not open for checkout": "activityNotOpen",
  "Activity already checked out": "activityNotOpen",
  "This image is already used by another activity": "imageAlreadyUsed",
  "This image is already used for checkout": "imageAlreadyUsed",
  "A valid JPG, PNG or WebP image under 5 MB is required": "invalidImage",
  uploadError: "uploadError",
};

export function activityErrorKey(error: unknown) {
  const message =
    error instanceof ConvexError
      ? error.data
      : error instanceof Error
        ? error.message
        : null;
  return typeof message === "string"
    ? (errorKeys[message] ?? "saveError")
    : "saveError";
}
