"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { protocol, rootDomain, sanitizeSlug } from "@/lib/utils";
import { routing } from "@/i18n/routing";

/**
 * Server Action to redirect to an organization's subdomain.
 * Uses Next.js redirect() which supports cross-origin URLs in Server Actions.
 * Preserves the current locale in the redirect URL.
 */
export async function goToOrganizationAction(formData: FormData) {
  const slug = formData.get("slug") as string;

  if (!slug) {
    throw new Error("Organization slug is required");
  }

  const sanitizedSlug = sanitizeSlug(slug);
  const locale = await getLocale();

  // Build the tenant URL with locale prefix if not the default locale
  const localePath = locale === routing.defaultLocale ? "" : `/${locale}`;
  const tenantUrl = `${protocol}://${sanitizedSlug}.${rootDomain}${localePath}`;

  redirect(tenantUrl);
}
