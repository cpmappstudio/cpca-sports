import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const protocol =
  process.env.NODE_ENV === "production" ? "https" : "http";
export const rootDomain =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

export function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Sanitizes a slug for use in URLs.
 * Only allows lowercase letters, numbers, and hyphens.
 */
export function sanitizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/**
 * Builds a full tenant URL from a subdomain slug.
 * Example: buildTenantUrl("acme") => "http://acme.localhost:3000"
 */
export function buildTenantUrl(slug: string): string {
  const sanitized = sanitizeSlug(slug);
  return `${protocol}://${sanitized}.${rootDomain}`;
}
