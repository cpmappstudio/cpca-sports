/**
 * Centralized route definitions for the Payments Platform.
 *
 * This file provides type-safe route builders to avoid hardcoded paths
 * throughout the application. When architecture changes, update routes here
 * and TypeScript will flag any breaking usages.
 *
 * Route Hierarchy:
 *   /admin/*                       - Superadmin global routes
 *   /{league}/*                    - League-level routes
 *   /{league}/{club}/*             - Club-level routes
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
  home: "/",

  auth: {
    signIn: "/sign-in",
    signUp: "/sign-up",
  },

  onboarding: "/onboarding",

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

  league: {
    root: (leagueSlug: string) => `/${leagueSlug}`,

    offerings: {
      list: (leagueSlug: string) => `/${leagueSlug}/offerings`,
      detail: (leagueSlug: string, offeringId: string) =>
        `/${leagueSlug}/offerings/${offeringId}`,
      create: (leagueSlug: string) => `/${leagueSlug}/offerings/create`,
    },

    applications: {
      list: (leagueSlug: string) => `/${leagueSlug}/applications`,
      detail: (leagueSlug: string, applicationId: string) =>
        `/${leagueSlug}/applications/${applicationId}`,
    },

    members: {
      list: (leagueSlug: string) => `/${leagueSlug}/members`,
      detail: (leagueSlug: string, memberId: string) =>
        `/${leagueSlug}/members/${memberId}`,
    },

    fees: {
      list: (leagueSlug: string) => `/${leagueSlug}/fees`,
      assignments: (leagueSlug: string) => `/${leagueSlug}/fees/assignments`,
    },

    forms: {
      list: (leagueSlug: string) => `/${leagueSlug}/forms`,
      detail: (leagueSlug: string, formId: string) =>
        `/${leagueSlug}/forms/${formId}`,
      create: (leagueSlug: string) => `/${leagueSlug}/forms/create`,
    },

    staff: {
      list: (leagueSlug: string) => `/${leagueSlug}/staff`,
      detail: (leagueSlug: string, staffId: string) =>
        `/${leagueSlug}/staff/${staffId}`,
    },

    payments: (leagueSlug: string) => `/${leagueSlug}/payments`,

    settings: {
      root: (leagueSlug: string) => `/${leagueSlug}/settings`,
      appearance: (leagueSlug: string) => `/${leagueSlug}/settings/appearance`,
      notifications: (leagueSlug: string) =>
        `/${leagueSlug}/settings/notifications`,
      security: (leagueSlug: string) => `/${leagueSlug}/settings/security`,
      billing: (leagueSlug: string) => `/${leagueSlug}/settings/billing`,
    },
  },

  club: {
    root: (leagueSlug: string, clubSlug: string) =>
      `/${leagueSlug}/${clubSlug}`,

    offerings: {
      list: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/offerings`,
      detail: (leagueSlug: string, clubSlug: string, offeringId: string) =>
        `/${leagueSlug}/${clubSlug}/offerings/${offeringId}`,
      create: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/offerings/create`,
    },

    applications: {
      list: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/applications`,
      detail: (leagueSlug: string, clubSlug: string, applicationId: string) =>
        `/${leagueSlug}/${clubSlug}/applications/${applicationId}`,
    },

    members: {
      list: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/members`,
      detail: (leagueSlug: string, clubSlug: string, memberId: string) =>
        `/${leagueSlug}/${clubSlug}/members/${memberId}`,
    },

    fees: {
      list: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/fees`,
      assignments: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/fees/assignments`,
    },

    forms: {
      list: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/forms`,
      detail: (leagueSlug: string, clubSlug: string, formId: string) =>
        `/${leagueSlug}/${clubSlug}/forms/${formId}`,
      create: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/forms/create`,
    },

    staff: {
      list: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/staff`,
      detail: (leagueSlug: string, clubSlug: string, staffId: string) =>
        `/${leagueSlug}/${clubSlug}/staff/${staffId}`,
    },

    payments: (leagueSlug: string, clubSlug: string) =>
      `/${leagueSlug}/${clubSlug}/payments`,

    settings: {
      root: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/settings`,
      appearance: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/settings/appearance`,
      notifications: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/settings/notifications`,
      security: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/settings/security`,
      billing: (leagueSlug: string, clubSlug: string) =>
        `/${leagueSlug}/${clubSlug}/settings/billing`,
    },
  },
} as const;

export type Routes = typeof ROUTES;
