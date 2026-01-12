import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/backend";
import { internal } from "./_generated/api";

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await validateClerkRequest(request);
  if (!event) {
    return new Response(null, { status: 400 });
  }

  switch (event.type) {
    case "user.created": {
      const email = event.data.email_addresses[0]?.email_address ?? "";
      const publicMetadata = event.data.public_metadata as
        | {
            profileId?: string;
            firstName?: string;
            lastName?: string;
          }
        | undefined;

      // Priority 1: Check if profileId was passed via invitation metadata
      if (publicMetadata?.profileId) {
        await ctx.runMutation(internal.users.linkClerkAccount, {
          profileId: publicMetadata.profileId as any,
          clerkId: event.data.id,
        });

        await ctx.runAction(internal.users.syncRolesToClerk, {
          profileId: publicMetadata.profileId as any,
        });

        // Update profile with name/avatar from Clerk if available
        await ctx.runMutation(internal.users.updateProfileFromClerk, {
          profileId: publicMetadata.profileId as any,
          firstName: event.data.first_name ?? publicMetadata.firstName,
          lastName: event.data.last_name ?? publicMetadata.lastName,
          avatarUrl: event.data.image_url ?? undefined,
        });
        break;
      }

      // Priority 2: Check if this email was pre-created by admin
      const existingProfile = await ctx.runQuery(
        internal.users.getProfileByEmail,
        { email },
      );

      if (existingProfile && !existingProfile.clerkId) {
        // Link existing profile to this Clerk account
        await ctx.runMutation(internal.users.linkClerkAccount, {
          profileId: existingProfile._id,
          clerkId: event.data.id,
        });

        // Sync pre-assigned roles to Clerk
        await ctx.runAction(internal.users.syncRolesToClerk, {
          profileId: existingProfile._id,
        });

        // Update profile with name/avatar from Clerk
        await ctx.runMutation(internal.users.updateProfileFromClerk, {
          profileId: existingProfile._id,
          firstName: event.data.first_name ?? undefined,
          lastName: event.data.last_name ?? undefined,
          avatarUrl: event.data.image_url ?? undefined,
        });
      } else if (!existingProfile) {
        // New user signing up (shouldn't happen with sign-ups disabled)
        await ctx.runMutation(internal.users.createProfileInternal, {
          clerkId: event.data.id,
          email,
          firstName: event.data.first_name ?? undefined,
          lastName: event.data.last_name ?? undefined,
          avatarUrl: event.data.image_url ?? undefined,
        });
      }
      break;
    }
  }

  return new Response(null, { status: 200 });
});

const http = httpRouter();
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: handleClerkWebhook,
});

async function validateClerkRequest(
  request: Request,
): Promise<WebhookEvent | undefined> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set");
  }

  const payloadString = await request.text();
  const svixHeaders = {
    "svix-id": request.headers.get("svix-id")!,
    "svix-timestamp": request.headers.get("svix-timestamp")!,
    "svix-signature": request.headers.get("svix-signature")!,
  };

  const wh = new Webhook(webhookSecret);
  try {
    const event = wh.verify(payloadString, svixHeaders) as WebhookEvent;
    return event;
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);
    return undefined;
  }
}

export default http;
