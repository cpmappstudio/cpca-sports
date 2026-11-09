import { ConvexError } from "convex/values";

const errorKeys: Record<string, string> = {
  "Title is required": "titleRequired",
  "Invalid place": "invalidPlace",
  "Archived coaches cannot add activities": "coachArchived",
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
