import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireCoachAccess,
  requireCoachAdmin,
  requireCoachAdminForOrganization,
} from "./lib/coachAccess";
import { getCurrentUser } from "./lib/auth";
import { requireOrgAdmin } from "./lib/permissions";

const coachListItemValidator = v.object({
  _id: v.id("coaches"),
  _creationTime: v.number(),
  userId: v.id("users"),
  organizationId: v.id("organizations"),
  programId: v.id("programs"),
  positionId: v.id("programCoachOptions"),
  firstName: v.string(),
  lastName: v.string(),
  fullName: v.string(),
  email: v.string(),
  imageUrl: v.optional(v.string()),
  isActive: v.boolean(),
  isArchived: v.boolean(),
  programName: v.string(),
  programIconKey: v.optional(v.string()),
  positionName: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const coachDetailValidator = v.object({
  coach: v.object({
    _id: v.id("coaches"),
    _creationTime: v.number(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    programId: v.id("programs"),
    positionId: v.id("programCoachOptions"),
    isArchived: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  user: v.object({
    _id: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
  }),
  program: v.object({ _id: v.id("programs"), name: v.string() }),
  position: v.object({
    _id: v.id("programCoachOptions"),
    name: v.string(),
  }),
  isAdmin: v.boolean(),
});

export const listByOrganization = query({
  args: { organizationSlug: v.string(), isArchived: v.optional(v.boolean()) },
  returns: v.array(coachListItemValidator),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.organizationSlug);
    const isArchived = args.isArchived === true;
    const coaches = await ctx.db
      .query("coaches")
      .withIndex("byOrganizationAndArchived", (q) =>
        q.eq("organizationId", organization._id).eq("isArchived", isArchived),
      )
      .collect();

    const rows = await Promise.all(
      coaches.map(async (coach) => {
        const [user, program, position] = await Promise.all([
          ctx.db.get(coach.userId),
          ctx.db.get(coach.programId),
          ctx.db.get(coach.positionId),
        ]);
        if (!user || !program || !position) return null;
        return {
          _id: coach._id,
          _creationTime: coach._creationTime,
          userId: coach.userId,
          organizationId: coach.organizationId,
          programId: coach.programId,
          positionId: coach.positionId,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          imageUrl: user.imageUrl,
          isActive: user.isActive,
          isArchived: coach.isArchived,
          programName: program.name,
          positionName: position.name,
          createdAt: coach.createdAt,
          updatedAt: coach.updatedAt,
          programIconKey: program.iconKey,
        };
      }),
    );
    return rows
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  },
});

export const getById = query({
  args: { coachId: v.id("coaches"), organizationSlug: v.string() },
  returns: v.union(coachDetailValidator, v.null()),
  handler: async (ctx, args) => {
    try {
      const { coach, isAdmin } = await requireCoachAccess(ctx, args.coachId);
      const [organization, coachUser, program, position] = await Promise.all([
        ctx.db
          .query("organizations")
          .withIndex("bySlug", (q) => q.eq("slug", args.organizationSlug))
          .unique(),
        ctx.db.get(coach.userId),
        ctx.db.get(coach.programId),
        ctx.db.get(coach.positionId),
      ]);
      if (
        !organization ||
        organization._id !== coach.organizationId ||
        !coachUser ||
        !program ||
        !position
      ) {
        return null;
      }
      return {
        coach,
        user: {
          _id: coachUser._id,
          firstName: coachUser.firstName,
          lastName: coachUser.lastName,
          email: coachUser.email,
          imageUrl: coachUser.imageUrl,
          isActive: coachUser.isActive,
        },
        program: { _id: program._id, name: program.name },
        position: { _id: position._id, name: position.name },
        isAdmin,
      };
    } catch {
      return null;
    }
  },
});

export const getMine = query({
  args: { organizationSlug: v.string() },
  returns: v.union(v.id("coaches"), v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user.isActive) return null;
    const organization = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.organizationSlug))
      .unique();
    if (!organization) return null;
    const coach = await ctx.db
      .query("coaches")
      .withIndex("byUserAndOrganization", (q) =>
        q.eq("userId", user._id).eq("organizationId", organization._id),
      )
      .unique();
    return coach?._id ?? null;
  },
});

export const validateAssignment = query({
  args: {
    organizationSlug: v.string(),
    programId: v.id("programs"),
    positionId: v.id("programCoachOptions"),
    coachId: v.optional(v.id("coaches")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.organizationSlug);
    if (args.coachId) {
      await requireCoachAdminForOrganization(
        ctx,
        args.coachId,
        args.organizationSlug,
      );
    }
    const [program, position] = await Promise.all([
      ctx.db.get(args.programId),
      ctx.db.get(args.positionId),
    ]);
    if (!program || program.organizationId !== organization._id) {
      throw new Error("Invalid program");
    }
    if (
      !position ||
      position.programId !== program._id ||
      position.kind !== "position"
    ) {
      throw new Error("Invalid position");
    }
    return null;
  },
});

export const provision = mutation({
  args: {
    organizationSlug: v.string(),
    clerkId: v.string(),
    clerkMembershipId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    programId: v.id("programs"),
    positionId: v.id("programCoachOptions"),
  },
  returns: v.id("coaches"),
  handler: async (ctx, args) => {
    const { user: admin, organization } = await requireOrgAdmin(
      ctx,
      args.organizationSlug,
    );
    const [program, position, existingUser, tombstone] = await Promise.all([
      ctx.db.get(args.programId),
      ctx.db.get(args.positionId),
      ctx.db
        .query("users")
        .withIndex("byClerkId", (q) => q.eq("clerkId", args.clerkId))
        .unique(),
      ctx.db
        .query("clerkUserTombstones")
        .withIndex("byClerkId", (q) => q.eq("clerkId", args.clerkId))
        .unique(),
    ]);
    if (tombstone) throw new Error("This Clerk user has been deleted");
    if (!program || program.organizationId !== organization._id) {
      throw new Error("Invalid program");
    }
    if (
      !position ||
      position.programId !== program._id ||
      position.kind !== "position"
    ) {
      throw new Error("Invalid position");
    }
    const now = Date.now();
    const userId =
      existingUser?._id ??
      (await ctx.db.insert("users", {
        clerkId: args.clerkId,
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        email: args.email.trim().toLowerCase(),
        imageUrl: args.imageUrl,
        isActive: args.isActive,
        isSuperAdmin: false,
      }));
    if (existingUser) {
      const existingCoach = await ctx.db
        .query("coaches")
        .withIndex("byUser", (q) => q.eq("userId", existingUser._id))
        .first();
      if (existingCoach) throw new Error("This Clerk user is already a coach");
      await ctx.db.patch(existingUser._id, {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        email: args.email.trim().toLowerCase(),
        imageUrl: args.imageUrl,
        isActive: args.isActive,
      });
    }
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("byUserAndOrg", (q) =>
        q.eq("userId", userId).eq("organizationId", organization._id),
      )
      .unique();
    if (!existingMembership) {
      await ctx.db.insert("organizationMembers", {
        userId,
        organizationId: organization._id,
        clerkMembershipId: args.clerkMembershipId,
        role: "member",
        createdAt: now,
      });
    }
    return await ctx.db.insert("coaches", {
      organizationId: organization._id,
      userId,
      programId: program._id,
      positionId: position._id,
      isArchived: false,
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProvisioned = mutation({
  args: {
    coachId: v.id("coaches"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    programId: v.id("programs"),
    positionId: v.id("programCoachOptions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { coach } = await requireCoachAdmin(ctx, args.coachId);
    const [program, position] = await Promise.all([
      ctx.db.get(args.programId),
      ctx.db.get(args.positionId),
    ]);
    if (!program || program.organizationId !== coach.organizationId) {
      throw new Error("Invalid program");
    }
    if (
      !position ||
      position.programId !== program._id ||
      position.kind !== "position"
    ) {
      throw new Error("Invalid position");
    }
    await Promise.all([
      ctx.db.patch(coach.userId, {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        email: args.email.trim().toLowerCase(),
        imageUrl: args.imageUrl,
        isActive: args.isActive,
      }),
      ctx.db.patch(coach._id, {
        programId: program._id,
        positionId: position._id,
        updatedAt: Date.now(),
      }),
    ]);
    return null;
  },
});

export const setActiveProvisioned = mutation({
  args: { coachId: v.id("coaches"), isActive: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { coach } = await requireCoachAdmin(ctx, args.coachId);
    await ctx.db.patch(coach.userId, { isActive: args.isActive });
    return null;
  },
});

export const setArchived = mutation({
  args: { coachId: v.id("coaches"), isArchived: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { coach } = await requireCoachAdmin(ctx, args.coachId);
    await ctx.db.patch(coach._id, {
      isArchived: args.isArchived,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const cleanupFailedProvision = mutation({
  args: { organizationSlug: v.string(), clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.organizationSlug);
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return null;
    const [coach, application] = await Promise.all([
      ctx.db
        .query("coaches")
        .withIndex("byUser", (q) => q.eq("userId", user._id))
        .first(),
      ctx.db
        .query("applications")
        .withIndex("byUserId", (q) => q.eq("userId", user._id))
        .first(),
    ]);
    if (application) return null;
    if (coach) {
      const isRecentTargetCoach =
        coach.organizationId === organization._id &&
        Date.now() - coach.createdAt < 5 * 60 * 1000;
      const activity = await ctx.db
        .query("coachActivities")
        .withIndex("byCoach", (q) => q.eq("coachId", coach._id))
        .first();
      if (!isRecentTargetCoach || activity) return null;
      await ctx.db.delete(coach._id);
    }
    const targetMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("byUserAndOrg", (q) =>
        q.eq("userId", user._id).eq("organizationId", organization._id),
      )
      .unique();
    if (targetMembership) await ctx.db.delete(targetMembership._id);
    const remainingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .first();
    if (!remainingMembership) {
      const tombstone = await ctx.db
        .query("clerkUserTombstones")
        .withIndex("byClerkId", (q) => q.eq("clerkId", user.clerkId))
        .unique();
      if (!tombstone) {
        await ctx.db.insert("clerkUserTombstones", {
          clerkId: user.clerkId,
          deletedAt: Date.now(),
        });
      }
      await ctx.db.delete(user._id);
    }
    return null;
  },
});

export const getProvisioningInfo = query({
  args: { coachId: v.id("coaches"), organizationSlug: v.string() },
  returns: v.union(v.object({ clerkId: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const { coach } = await requireCoachAdminForOrganization(
      ctx,
      args.coachId,
      args.organizationSlug,
    );
    const user = await ctx.db.get(coach.userId);
    return user ? { clerkId: user.clerkId } : null;
  },
});

export const getDeletionInfo = query({
  args: { coachId: v.id("coaches"), organizationSlug: v.string() },
  returns: v.union(v.object({ clerkId: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const { coach } = await requireCoachAdminForOrganization(
      ctx,
      args.coachId,
      args.organizationSlug,
    );
    const [user, application, memberships] = await Promise.all([
      ctx.db.get(coach.userId),
      ctx.db
        .query("applications")
        .withIndex("byUserId", (q) => q.eq("userId", coach.userId))
        .first(),
      ctx.db
        .query("organizationMembers")
        .withIndex("byUserId", (q) => q.eq("userId", coach.userId))
        .collect(),
    ]);
    if (!user) return null;
    if (application) {
      throw new Error("This coach has an application and cannot be deleted");
    }
    if (
      user.isSuperAdmin ||
      memberships.some((membership) => membership.role !== "member")
    ) {
      throw new Error("Administrator accounts cannot be deleted as coaches");
    }
    if (
      memberships.some(
        (membership) => membership.organizationId !== coach.organizationId,
      )
    ) {
      throw new Error(
        "This coach belongs to another organization and cannot be deleted",
      );
    }
    return { clerkId: user.clerkId };
  },
});

export const deleteLocal = mutation({
  args: { coachId: v.id("coaches") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { coach } = await requireCoachAdmin(ctx, args.coachId);
    const [user, application, memberships] = await Promise.all([
      ctx.db.get(coach.userId),
      ctx.db
        .query("applications")
        .withIndex("byUserId", (q) => q.eq("userId", coach.userId))
        .first(),
      ctx.db
        .query("organizationMembers")
        .withIndex("byUserId", (q) => q.eq("userId", coach.userId))
        .collect(),
    ]);
    if (!user) throw new Error("Coach user not found");
    if (application) {
      throw new Error("This coach has an application and cannot be deleted");
    }
    if (
      user.isSuperAdmin ||
      memberships.some((membership) => membership.role !== "member")
    ) {
      throw new Error("Administrator accounts cannot be deleted as coaches");
    }
    if (
      memberships.some(
        (membership) => membership.organizationId !== coach.organizationId,
      )
    ) {
      throw new Error(
        "This coach belongs to another organization and cannot be deleted",
      );
    }
    const activities = await ctx.db
      .query("coachActivities")
      .withIndex("byCoach", (q) => q.eq("coachId", coach._id))
      .take(50);
    for (const activity of activities) {
      await ctx.storage.delete(activity.imageStorageId);
      await ctx.db.delete(activity._id);
    }
    const hasMoreActivities = await ctx.db
      .query("coachActivities")
      .withIndex("byCoach", (q) => q.eq("coachId", coach._id))
      .first();
    if (hasMoreActivities) return false;
    for (const membership of memberships) await ctx.db.delete(membership._id);
    const tombstone = await ctx.db
      .query("clerkUserTombstones")
      .withIndex("byClerkId", (q) => q.eq("clerkId", user.clerkId))
      .unique();
    if (!tombstone) {
      await ctx.db.insert("clerkUserTombstones", {
        clerkId: user.clerkId,
        deletedAt: Date.now(),
      });
    }
    await ctx.db.delete(coach._id);
    await ctx.db.delete(coach.userId);
    return true;
  },
});
