import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { isSingleTenantMode } from "@/lib/tenancy/config";
import {
  coachRouteError,
  requireCoachRouteAdmin,
} from "@/lib/coaches/route-access";

interface RouteContext {
  params: Promise<{ tenant: string }>;
}

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, { params }: RouteContext) {
  let createdClerkUserId: string | undefined;
  let provisioningToken: string | undefined;
  let tenantSlug: string | undefined;
  try {
    const { tenant } = await params;
    tenantSlug = tenant;
    const { token } = await requireCoachRouteAdmin(tenant);
    provisioningToken = token;
    const form = await request.formData();
    const firstName = text(form, "firstName");
    const lastName = text(form, "lastName");
    const email = text(form, "email").toLowerCase();
    const password = text(form, "password");
    const programId = text(form, "programId") as Id<"programs">;
    const positionId = text(form, "positionId") as Id<"programCoachOptions">;
    const isActive = text(form, "isActive") !== "false";
    const image = form.get("image");

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !programId ||
      !positionId
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await fetchQuery(
      api.coaches.validateAssignment,
      { organizationSlug: tenant, programId, positionId },
      { token },
    );

    const client = await clerkClient();
    let clerkUser = await client.users.createUser({
      firstName,
      lastName,
      emailAddress: [email],
      password,
      publicMetadata: isSingleTenantMode() ? { role: "member" } : undefined,
    });
    createdClerkUserId = clerkUser.id;

    if (image instanceof File && image.size > 0) {
      clerkUser = await client.users.updateUserProfileImage(clerkUser.id, {
        file: image,
      });
    }

    let clerkMembershipId = `single:${tenant}:${clerkUser.id}`;
    if (!isSingleTenantMode()) {
      const organization = await client.organizations.getOrganization({
        slug: tenant,
      });
      const membership =
        await client.organizations.createOrganizationMembership({
          organizationId: organization.id,
          userId: clerkUser.id,
          role: "org:member",
        });
      clerkMembershipId = membership.id;
    }
    if (!isActive) clerkUser = await client.users.banUser(clerkUser.id);

    const coachId = await fetchMutation(
      api.coaches.provision,
      {
        organizationSlug: tenant,
        clerkId: clerkUser.id,
        clerkMembershipId,
        firstName: clerkUser.firstName ?? firstName,
        lastName: clerkUser.lastName ?? lastName,
        email,
        imageUrl: clerkUser.imageUrl || undefined,
        isActive,
        programId,
        positionId,
      },
      { token },
    );

    return NextResponse.json({ coachId }, { status: 201 });
  } catch (error) {
    if (createdClerkUserId) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(createdClerkUserId);
      } catch {
        // The original error is more useful to the caller.
      }
      if (provisioningToken && tenantSlug) {
        try {
          await fetchMutation(
            api.coaches.cleanupFailedProvision,
            { organizationSlug: tenantSlug, clerkId: createdClerkUserId },
            { token: provisioningToken },
          );
        } catch {
          // The original error is more useful to the caller.
        }
      }
    }
    const resolved = coachRouteError(error, "Failed to create coach");
    return NextResponse.json(
      { error: resolved.message },
      { status: resolved.status },
    );
  }
}
