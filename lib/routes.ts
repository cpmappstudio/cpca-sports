/**
 * Centralized route definitions for the Payments Platform.
 *
 * This file provides type-safe route builders to avoid hardcoded paths
 * throughout the application. When architecture changes, update routes here
 * and TypeScript will flag any breaking usages.
 *
 * Route Hierarchy:
 *   /admin/*                    - Superadmin global routes
 *   /{organization}/*           - Organization-level routes
 *
 * Usage:
 *   import { ROUTES } from "@/lib/routes";
 *
 *   // Static routes
 *   ROUTES.home                              // "/"
 *   ROUTES.auth.signIn                       // "/sign-in"
 *
 *   // Admin routes
 *   ROUTES.admin.root                        // "/admin"
 *   ROUTES.admin.organizations.list          // "/admin/organizations"
 *
 *   // Organization routes
 *   ROUTES.org.root(orgSlug)                 // "/acme"
 *   ROUTES.org.offerings.list(orgSlug)       // "/acme/offerings"
 *   ROUTES.org.members.detail(orgSlug, id)   // "/acme/members/123"
 */

export const ROUTE_SEGMENTS = {
  dashboard: "",
  organizations: "organizations",
  offerings: "offerings",
  applications: "applications",
  members: "members",
  fees: "fees",
  forms: "forms",
  staff: "staff",
  payments: "payments",
  settings: "settings",
  appearance: "appearance",
  notifications: "notifications",
  security: "security",
  billing: "billing",
} as const;

export type RouteSegment = (typeof ROUTE_SEGMENTS)[keyof typeof ROUTE_SEGMENTS];

export const ROUTES = {
  // Public routes
  home: "/",

  // Auth routes
  auth: {
    signIn: "/sign-in",
    signUp: "/sign-up",
  },

  // Onboarding
  onboarding: "/onboarding",

  // Superadmin routes (/admin/*)
  admin: {
    root: "/admin",

    organizations: {
      list: "/admin/organizations",
      detail: (orgId: string) => `/admin/organizations/${orgId}`,
      create: "/admin/organizations/create",
    },

    settings: {
      root: "/admin/settings",
      appearance: "/admin/settings/appearance",
      notifications: "/admin/settings/notifications",
      security: "/admin/settings/security",
      billing: "/admin/settings/billing",
    },
  },

  // Organization routes (/{organization}/*)
  org: {
    root: (orgSlug: string) => `/${orgSlug}`,

    offerings: {
      list: (orgSlug: string) => `/${orgSlug}/offerings`,
      detail: (orgSlug: string, offeringId: string) =>
        `/${orgSlug}/offerings/${offeringId}`,
      create: (orgSlug: string) => `/${orgSlug}/offerings/create`,
    },

    applications: {
      list: (orgSlug: string) => `/${orgSlug}/applications`,
      detail: (orgSlug: string, applicationId: string) =>
        `/${orgSlug}/applications/${applicationId}`,
    },

    members: {
      list: (orgSlug: string) => `/${orgSlug}/members`,
      detail: (orgSlug: string, memberId: string) =>
        `/${orgSlug}/members/${memberId}`,
      fees: (orgSlug: string, memberId: string) =>
        `/${orgSlug}/members/${memberId}/fees`,
    },

    fees: {
      templates: (orgSlug: string) => `/${orgSlug}/fees`,
      assignments: (orgSlug: string) => `/${orgSlug}/fees/assignments`,
    },

    forms: {
      list: (orgSlug: string) => `/${orgSlug}/forms`,
      detail: (orgSlug: string, formId: string) =>
        `/${orgSlug}/forms/${formId}`,
      create: (orgSlug: string) => `/${orgSlug}/forms/create`,
    },

    staff: {
      list: (orgSlug: string) => `/${orgSlug}/staff`,
      detail: (orgSlug: string, staffId: string) =>
        `/${orgSlug}/staff/${staffId}`,
    },

    payments: (orgSlug: string) => `/${orgSlug}/payments`,

    settings: {
      root: (orgSlug: string) => `/${orgSlug}/settings`,
      appearance: (orgSlug: string) => `/${orgSlug}/settings/appearance`,
      notifications: (orgSlug: string) => `/${orgSlug}/settings/notifications`,
      security: (orgSlug: string) => `/${orgSlug}/settings/security`,
      billing: (orgSlug: string) => `/${orgSlug}/settings/billing`,
    },
  },

  // Utility for building dynamic href in navigation config
  buildOrgHref: (orgSlug: string, segment: string) =>
    segment ? `/${orgSlug}/${segment}` : `/${orgSlug}`,
} as const;

export type Routes = typeof ROUTES;
