import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/backend";
import { internal } from "./_generated/api";

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await validateClerkRequest(request);
  if (!event) {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });
        break;

      case "user.deleted":
        if (event.data?.id) {
          await ctx.runMutation(internal.users.deactivateUser, {
            clerkId: event.data.id,
          });
        }
        break;

      case "organization.created": {
        const orgId = event.data.id;
        const name = event.data.name;
        const slug = event.data.slug ?? orgId;

        await ctx.runMutation(internal.organizations.createFromClerk, {
          organizationId: orgId,
          name,
          slug,
        });
        break;
      }

      case "organization.updated": {
        const orgId = event.data.id;
        const name = event.data.name;
        const slug = event.data.slug ?? orgId;

        await ctx.runMutation(internal.organizations.updateFromClerk, {
          organizationId: orgId,
          name,
          slug,
        });
        break;
      }

      case "organizationMembership.created": {
        const userId = event.data.public_user_data?.user_id;
        const orgId = event.data.organization.id;
        const role = event.data.role;

        if (userId && orgId) {
          await ctx.runMutation(internal.users.assignOrganizationRole, {
            clerkId: userId,
            organizationId: orgId,
            clerkRole: role,
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as Error;
    // Return 200 to prevent Clerk from retrying infinitely
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

const http = httpRouter();
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: handleClerkWebhook,
});

async function validateClerkRequest(
  request: Request
): Promise<WebhookEvent | undefined> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return undefined;
  }

  const payload = await request.text();
  const svixHeaders = {
    "svix-id": request.headers.get("svix-id") || "",
    "svix-timestamp": request.headers.get("svix-timestamp") || "",
    "svix-signature": request.headers.get("svix-signature") || "",
  };

  const wh = new Webhook(webhookSecret);
  try {
    const event = wh.verify(payload, svixHeaders) as WebhookEvent;
    return event;
  } catch (err) {
    const error = err as Error;
    return undefined;
  }
}

export default http;