import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { locales, routing, type Locale } from "@/i18n/routing";

const INVITABLE_ROLES = ["org:member", "org:admin"] as const;
type InvitableRole = (typeof INVITABLE_ROLES)[number];

interface RouteContext {
  params: Promise<{ tenant: string }>;
}

class InvitationAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function canManageInvitations(role: string | null | undefined) {
  return role === "org:admin" || role === "org:superadmin";
}

function isInvitableRole(role: unknown): role is InvitableRole {
  return (
    typeof role === "string" && INVITABLE_ROLES.includes(role as InvitableRole)
  );
}

function resolveLocale(value: unknown): Locale {
  if (typeof value === "string" && locales.includes(value as Locale)) {
    return value as Locale;
  }
  return routing.defaultLocale;
}

function resolveErrorStatus(error: unknown): number {
  if (error instanceof InvitationAccessError) {
    return error.status;
  }

  const status = (error as { status?: unknown })?.status;
  if (typeof status === "number") {
    return status;
  }

  const errors = (error as { errors?: Array<{ code?: string }> })?.errors;
  if (errors?.some((item) => item.code === "resource_not_found")) {
    return 404;
  }

  return 500;
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  const errors = (error as { errors?: Array<{ message?: string }> })?.errors;
  const firstMessage = errors?.find(
    (item) => typeof item.message === "string",
  )?.message;

  return firstMessage ?? fallback;
}

async function requireInvitationAccess(tenant: string) {
  const authObject = await auth();
  const { userId, orgId, orgSlug, has } = authObject;

  if (!userId) {
    throw new InvitationAccessError(401, "Unauthorized");
  }

  const hasActiveOrgAccess =
    orgSlug === tenant &&
    orgId &&
    (has?.({ role: "org:admin" }) || has?.({ role: "org:superadmin" }));

  if (hasActiveOrgAccess) {
    return { userId, organizationId: orgId };
  }

  const client = await clerkClient();
  const organization = await client.organizations.getOrganization({
    slug: tenant,
  });

  const memberships = await client.users.getOrganizationMembershipList({
    userId,
    limit: 200,
  });

  const membership = memberships.data.find(
    (item) => item.organization.id === organization.id,
  );

  if (!membership) {
    throw new InvitationAccessError(403, "Forbidden");
  }

  if (!canManageInvitations(membership.role)) {
    throw new InvitationAccessError(403, "Forbidden");
  }

  return { userId, organizationId: organization.id };
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { tenant } = await params;
    const { userId, organizationId } = await requireInvitationAccess(tenant);

    const body = (await request.json()) as {
      emailAddress?: unknown;
      role?: unknown;
      locale?: unknown;
    };

    const emailAddress =
      typeof body.emailAddress === "string" ? body.emailAddress.trim() : "";
    if (!emailAddress) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 },
      );
    }

    if (!isInvitableRole(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const locale = resolveLocale(body.locale);
    const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    const redirectUrl = new URL(
      `${localePrefix}/${tenant}/sign-up`,
      request.url,
    ).toString();

    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId,
      inviterUserId: userId,
      emailAddress,
      role: body.role,
      redirectUrl,
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        emailAddress: invitation.emailAddress,
        role: invitation.role,
      },
    });
  } catch (error) {
    const status = resolveErrorStatus(error);
    const fallbackMessage =
      status >= 500
        ? "Failed to create organization invitation"
        : "Unable to create organization invitation";
    const message = resolveErrorMessage(error, fallbackMessage);

    return NextResponse.json({ error: message }, { status });
  }
}
