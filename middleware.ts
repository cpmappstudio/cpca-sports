import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher([
  "/sign-in(.*)", // login global (superadmin)
  "/:org/sign-in(.*)", // login de tenant
  "/:org/sign-up(.*)",
  "/:org/apply(.*)", // páginas públicas del tenant (si las tienes)
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublic(req)) await auth.protect();
  },
  {
    // Activa/ajusta la organización según el slug de la URL
    organizationSyncOptions: {
      organizationPatterns: ["/:slug", "/:slug/(.*)"], // si usas i18n: añade '/:locale/:slug...'
    },
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
