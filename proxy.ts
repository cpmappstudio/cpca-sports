import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing, locales } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);
const ORGANIZATIONS_PATH = "/organizations";

// Only sign-in and sign-up routes are public
const isPublicRoute = createRouteMatcher([
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/:locale/:slug/sign-in(.*)",
  "/:locale/:slug/sign-up(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/:slug/sign-in(.*)",
  "/:slug/sign-up(.*)",
]);

// Admin routes are blocked at proxy level.
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/:locale/admin(.*)"]);

// Reserved paths that are not tenant slugs
const RESERVED_PATHS = new Set([
  "admin",
  "sign-in",
  "sign-up",
  "organizations",
  "api",
  "_next",
  "static",
  ...locales,
]);

/**
 * Extract tenant slug from pathname.
 */
function extractTenant(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);

  // Skip locale if present
  let startIndex = 0;
  if (
    segments[0] &&
    locales.includes(segments[0] as (typeof locales)[number])
  ) {
    startIndex = 1;
  }

  const potentialTenant = segments[startIndex];
  return potentialTenant && !RESERVED_PATHS.has(potentialTenant)
    ? potentialTenant
    : null;
}

function extractLocale(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const potentialLocale = segments[0];
  if (
    potentialLocale &&
    locales.includes(potentialLocale as (typeof locales)[number])
  ) {
    return potentialLocale;
  }
  return null;
}

function buildLocalizedPath(pathname: string, basePath: string): string {
  const locale = extractLocale(pathname);
  return locale ? `/${locale}${basePath}` : basePath;
}

export default clerkMiddleware(
  async (auth, req) => {
    if (isAdminRoute(req)) {
      const redirectPath = buildLocalizedPath(
        req.nextUrl.pathname,
        ORGANIZATIONS_PATH,
      );
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    const authObject = await auth();
    const { userId } = authObject;
    const isAuthenticated = !!userId;

    // Protect all routes except public ones
    if (!isAuthenticated && !isPublicRoute(req)) {
      const tenant = extractTenant(req.nextUrl.pathname);
      const signInPath = tenant ? `/${tenant}/sign-in` : "/sign-in";
      const signInUrl = new URL(signInPath, req.url);
      signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    return intlMiddleware(req);
  },
  {
    organizationSyncOptions: {
      // Sync organization based on URL slug (excludes admin via RESERVED_PATHS)
      organizationPatterns: [
        "/:slug",
        "/:slug/(.*)",
        "/:locale/:slug",
        "/:locale/:slug/(.*)",
      ],
    },
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
