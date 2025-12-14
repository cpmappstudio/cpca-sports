import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

/**
 * Extracts subdomain from the request URL.
 * Supports local development (*.localhost) and production (*.domain.com)
 */
function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // Local development environment
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    if (hostname.includes(".localhost")) {
      return hostname.split(".")[0];
    }

    return null;
  }

  // Production environment
  const rootDomainFormatted = ROOT_DOMAIN.split(":")[0];

  // Handle Vercel preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    const parts = hostname.split("---");
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, "") : null;
}

/**
 * Extracts locale from pathname (e.g., /en/page -> "en")
 */
function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length > 0 &&
    routing.locales.includes(segments[0] as (typeof routing.locales)[number])
  ) {
    return segments[0];
  }
  return null;
}

/**
 * Gets preferred locale from Accept-Language header
 */
function getLocaleFromHeaders(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") || "";
  const preferredLocale = acceptLanguage.split(",")[0]?.split("-")[0];

  if (
    preferredLocale &&
    routing.locales.includes(
      preferredLocale as (typeof routing.locales)[number],
    )
  ) {
    return preferredLocale;
  }

  return routing.defaultLocale;
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const subdomain = extractSubdomain(req);

  if (subdomain) {
    // Check if on auth pages - let them through without auth check
    const isAuthPage =
      pathname.includes("/sign-in") || pathname.includes("/sign-up");

    if (!isAuthPage) {
      // Check authentication for non-auth pages on subdomains
      const { userId } = await auth();

      if (!userId) {
        // Redirect to subdomain's own sign-in
        const locale = getLocaleFromHeaders(req);
        const localePath = locale === routing.defaultLocale ? "" : `/${locale}`;
        return NextResponse.redirect(new URL(`${localePath}/sign-in`, req.url));
      }
    }

    // Block access to admin pages from subdomains
    if (pathname.startsWith("/admin") || pathname.match(/^\/[a-z]{2}\/admin/)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Rewrite root path to tenant page
    if (pathname === "/") {
      const locale = getLocaleFromHeaders(req);
      const localePath = locale === routing.defaultLocale ? "" : `/${locale}`;
      return NextResponse.rewrite(
        new URL(`${localePath}/s/${subdomain}`, req.url),
      );
    }

    // Handle locale-only paths (e.g., /en or /en/ on subdomain)
    const pathLocale = getLocaleFromPath(pathname);
    if (
      pathLocale &&
      (pathname === `/${pathLocale}` || pathname === `/${pathLocale}/`)
    ) {
      return NextResponse.rewrite(
        new URL(`/${pathLocale}/s/${subdomain}`, req.url),
      );
    }

    // All other subdomain paths pass through
    return NextResponse.next();
  }

  // Primary domain: use next-intl middleware
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api routes
     * - /_next (Next.js internals)
     * - Static files in /public
     */
    "/((?!api|_next|[\\w-]+\\.\\w+).*)",
  ],
};
