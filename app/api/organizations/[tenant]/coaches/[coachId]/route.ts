import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  coachRouteError,
  requireCoachRouteAdmin,
} from "@/lib/coaches/route-access";

interface RouteContext {
  params: Promise<{ tenant: string; coachId: string }>;
}

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isResourceNotFound(error: unknown) {
  return (error as { errors?: Array<{ code?: string }> })?.errors?.some(
    (item) => item.code === "resource_not_found",
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { tenant, coachId: rawCoachId } = await params;
    const coachId = rawCoachId as Id<"coaches">;
    const { token } = await requireCoachRouteAdmin(tenant);
    const info = await fetchQuery(
      api.coaches.getProvisioningInfo,
      { coachId, organizationSlug: tenant },
      { token },
    );
    if (!info)
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });

    const form = await request.formData();
    const intent = text(form, "intent");
    const client = await clerkClient();
    if (intent === "status") {
      const isActive = text(form, "isActive") !== "false";
      let clerkUser = await client.users.getUser(info.clerkId);
      if (isActive) {
        if (clerkUser.banned) {
          clerkUser = await client.users.unbanUser(info.clerkId);
        }
        if (clerkUser.locked) {
          await client.users.unlockUser(info.clerkId);
        }
      } else if (!clerkUser.banned) {
        clerkUser = await client.users.banUser(info.clerkId);
      }
      await fetchMutation(
        api.coaches.setActiveProvisioned,
        { coachId, isActive },
        { token },
      );
      return NextResponse.json({ coachId });
    }
    const firstName = text(form, "firstName");
    const lastName = text(form, "lastName");
    const email = text(form, "email").toLowerCase();
    const password = text(form, "password");
    const programId = text(form, "programId") as Id<"programs">;
    const positionId = text(form, "positionId") as Id<"programCoachOptions">;
    const isActive = text(form, "isActive") !== "false";
    const image = form.get("image");
    if (!firstName || !lastName || !email || !programId || !positionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await fetchQuery(
      api.coaches.validateAssignment,
      { organizationSlug: tenant, coachId, programId, positionId },
      { token },
    );

    let clerkUser = await client.users.updateUser(info.clerkId, {
      firstName,
      lastName,
      ...(password ? { password, signOutOfOtherSessions: true } : {}),
    });
    const primaryEmail = clerkUser.emailAddresses.find(
      (item) => item.id === clerkUser.primaryEmailAddressId,
    );
    if (primaryEmail?.emailAddress.toLowerCase() !== email) {
      await client.emailAddresses.createEmailAddress({
        userId: info.clerkId,
        emailAddress: email,
        verified: true,
        primary: true,
      });
      clerkUser = await client.users.getUser(info.clerkId);
      if (primaryEmail && primaryEmail.id !== clerkUser.primaryEmailAddressId) {
        await client.emailAddresses.deleteEmailAddress(primaryEmail.id);
      }
      clerkUser = await client.users.getUser(info.clerkId);
    }
    if (image instanceof File && image.size > 0) {
      clerkUser = await client.users.updateUserProfileImage(info.clerkId, {
        file: image,
      });
    }
    if (isActive) {
      if (clerkUser.banned) {
        clerkUser = await client.users.unbanUser(info.clerkId);
      }
      if (clerkUser.locked) {
        clerkUser = await client.users.unlockUser(info.clerkId);
      }
    } else if (!clerkUser.banned) {
      clerkUser = await client.users.banUser(info.clerkId);
    }

    await fetchMutation(
      api.coaches.updateProvisioned,
      {
        coachId,
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
    return NextResponse.json({ coachId });
  } catch (error) {
    const resolved = coachRouteError(error, "Failed to update coach");
    return NextResponse.json(
      { error: resolved.message },
      { status: resolved.status },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { tenant, coachId: rawCoachId } = await params;
    const coachId = rawCoachId as Id<"coaches">;
    const { token } = await requireCoachRouteAdmin(tenant);
    const info = await fetchQuery(
      api.coaches.getDeletionInfo,
      { coachId, organizationSlug: tenant },
      { token },
    );
    if (!info)
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });

    const client = await clerkClient();
    try {
      await client.users.deleteUser(info.clerkId);
    } catch (error) {
      if (!isResourceNotFound(error)) throw error;
    }
    let deleted = false;
    while (!deleted) {
      deleted = await fetchMutation(
        api.coaches.deleteLocal,
        { coachId },
        { token },
      );
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const resolved = coachRouteError(error, "Failed to delete coach");
    return NextResponse.json(
      { error: resolved.message },
      { status: resolved.status },
    );
  }
}
