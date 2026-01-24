import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

/**
 * List all staff by club slug (includes ClubAdmin/delegate from roleAssignments)
 */
export const listAllByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      club: v.object({
        _id: v.id("clubs"),
        name: v.string(),
      }),
      staff: v.array(
        v.object({
          _id: v.string(),
          profileId: v.id("profiles"),
          fullName: v.string(),
          email: v.string(),
          avatarUrl: v.optional(v.string()),
          role: v.string(),
          categoryName: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) {
      return null;
    }

    const staff: Array<{
      _id: string;
      profileId: Id<"profiles">;
      fullName: string;
      email: string;
      avatarUrl: string | undefined;
      role: string;
      categoryName: string | undefined;
    }> = [];

    // 1. Get ClubAdmin (delegate) from roleAssignments
    const clubAdminAssignments = await ctx.db
      .query("roleAssignments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", club._id))
      .filter((q) => q.eq(q.field("role"), "ClubAdmin"))
      .collect();

    for (const assignment of clubAdminAssignments) {
      const profile = await ctx.db.get(assignment.profileId);
      if (profile) {
        staff.push({
          _id: assignment._id,
          profileId: assignment.profileId,
          fullName:
            profile.displayName ||
            `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
            profile.email,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          role: "delegate",
          categoryName: undefined,
        });
      }
    }

    // 2. Get TechnicalDirectors and AssistantCoaches from categories
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    for (const category of categories) {
      if (category.technicalDirectorId) {
        const profile = await ctx.db.get(category.technicalDirectorId);
        if (profile) {
          // Avoid duplicates (same person could be delegate + TD)
          const exists = staff.some(
            (s) =>
              s.profileId === category.technicalDirectorId &&
              s.role === "technical_director",
          );
          if (!exists) {
            staff.push({
              _id: `${category._id}_td`,
              profileId: category.technicalDirectorId,
              fullName:
                profile.displayName ||
                `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
                profile.email,
              email: profile.email,
              avatarUrl: profile.avatarUrl,
              role: "technical_director",
              categoryName: category.name,
            });
          }
        }
      }

      if (category.assistantCoachIds) {
        for (const coachId of category.assistantCoachIds) {
          const profile = await ctx.db.get(coachId);
          if (profile) {
            const exists = staff.some(
              (s) => s.profileId === coachId && s.role === "assistant_coach",
            );
            if (!exists) {
              staff.push({
                _id: `${category._id}_ac_${coachId}`,
                profileId: coachId,
                fullName:
                  profile.displayName ||
                  `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
                  profile.email,
                email: profile.email,
                avatarUrl: profile.avatarUrl,
                role: "assistant_coach",
                categoryName: category.name,
              });
            }
          }
        }
      }
    }

    return {
      club: {
        _id: club._id,
        name: club.name,
      },
      staff,
    };
  },
});

/**
 * Add delegate (ClubAdmin) to a club
 */
export const addDelegate = mutation({
  args: {
    clubSlug: v.string(),
    email: v.string(),
  },
  returns: v.object({
    profileId: v.id("profiles"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get the current user's profile to use as inviter
    const inviterProfile = await ctx.db
      .query("profiles")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) {
      throw new Error("Club not found");
    }

    // Get league slug for redirect URL
    const league = await ctx.db.get(club.leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const email = args.email.trim().toLowerCase();

    // Find or create profile
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    let created = false;

    if (!profile) {
      const profileId = await ctx.db.insert("profiles", {
        clerkId: "",
        email,
      });
      profile = await ctx.db.get(profileId);
      created = true;

      // Schedule Clerk organization invitation
      await ctx.scheduler.runAfter(0, internal.users.createClerkAccount, {
        profileId,
        email,
        firstName: "",
        lastName: "",
        orgSlug: league.slug,
        teamSlug: club.slug,
        clerkOrgId: league.clerkOrgId,
        inviterUserId: inviterProfile?.clerkId,
        role: "org:delegate",
      });
    } else if (!profile.clerkId) {
      // Profile exists but never completed sign-up, re-send invitation
      await ctx.scheduler.runAfter(0, internal.users.createClerkAccount, {
        profileId: profile._id,
        email,
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        orgSlug: league.slug,
        teamSlug: club.slug,
        clerkOrgId: league.clerkOrgId,
        inviterUserId: inviterProfile?.clerkId,
        role: "org:delegate",
      });
    }

    if (!profile) throw new Error("Failed to create profile");

    // Check if already has ClubAdmin role for this club
    const existingRole = await ctx.db
      .query("roleAssignments")
      .withIndex("by_profileId_and_organizationId", (q) =>
        q.eq("profileId", profile!._id).eq("organizationId", club._id),
      )
      .filter((q) => q.eq(q.field("role"), "ClubAdmin"))
      .first();

    if (!existingRole) {
      await ctx.db.insert("roleAssignments", {
        profileId: profile._id,
        role: "ClubAdmin",
        organizationId: club._id,
        organizationType: "club",
        assignedAt: Date.now(),
      });

      if (profile.clerkId) {
        await ctx.scheduler.runAfter(0, internal.users.syncRolesToClerk, {
          profileId: profile._id,
        });
      }
    }

    return { profileId: profile._id, created };
  },
});

/**
 * Remove delegate (ClubAdmin) from a club
 */
export const removeDelegate = mutation({
  args: {
    clubSlug: v.string(),
    profileId: v.id("profiles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) {
      throw new Error("Club not found");
    }

    // Find the role assignment
    const assignment = await ctx.db
      .query("roleAssignments")
      .withIndex("by_profileId_and_organizationId", (q) =>
        q.eq("profileId", args.profileId).eq("organizationId", club._id),
      )
      .filter((q) => q.eq(q.field("role"), "ClubAdmin"))
      .first();

    if (!assignment) {
      throw new Error("Delegate not found");
    }

    await ctx.db.delete(assignment._id);

    return null;
  },
});

/**
 * List staff by club slug (legacy - categories only)
 */
export const listByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      club: v.object({
        _id: v.id("clubs"),
        name: v.string(),
      }),
      staff: v.array(
        v.object({
          _id: v.id("categories"),
          _creationTime: v.number(),
          profileId: v.id("profiles"),
          fullName: v.string(),
          avatarUrl: v.optional(v.string()),
          role: v.string(),
          categoryName: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    // Find club by slug
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) {
      return null;
    }

    // Get all categories for this club (categories have technicalDirectorId)
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    const staff: Array<{
      _id: Id<"categories">;
      _creationTime: number;
      profileId: Id<"profiles">;
      fullName: string;
      avatarUrl: string | undefined;
      role: string;
      categoryName: string | undefined;
    }> = [];

    for (const category of categories) {
      // Add technical director if exists
      if (category.technicalDirectorId) {
        const profile = await ctx.db.get(category.technicalDirectorId);
        if (profile) {
          staff.push({
            _id: category._id,
            _creationTime: category._creationTime,
            profileId: category.technicalDirectorId,
            fullName: profile.displayName || profile.email || "Unknown",
            avatarUrl: profile.avatarUrl,
            role: "technical_director",
            categoryName: category.name,
          });
        }
      }

      // Add assistant coaches if exist
      if (category.assistantCoachIds) {
        for (const coachId of category.assistantCoachIds) {
          const profile = await ctx.db.get(coachId);
          if (profile) {
            staff.push({
              _id: category._id,
              _creationTime: category._creationTime,
              profileId: coachId,
              fullName: profile.displayName || profile.email || "Unknown",
              avatarUrl: profile.avatarUrl,
              role: "assistant_coach",
              categoryName: category.name,
            });
          }
        }
      }
    }

    return {
      club: {
        _id: club._id,
        name: club.name,
      },
      staff,
    };
  },
});

/**
 * Get staff member by profile ID (shows all their assignments)
 */
export const getByProfileId = query({
  args: { profileId: v.id("profiles") },
  returns: v.object({
    profile: v.object({
      _id: v.id("profiles"),
      displayName: v.optional(v.string()),
      email: v.string(),
      avatarUrl: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
    }),
    assignments: v.array(
      v.object({
        categoryId: v.id("categories"),
        categoryName: v.string(),
        clubName: v.string(),
        role: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Find all categories where this person is TD or assistant
    const allCategories = await ctx.db.query("categories").collect();

    const assignments: Array<{
      categoryId: Id<"categories">;
      categoryName: string;
      clubName: string;
      role: string;
    }> = [];

    for (const category of allCategories) {
      let role: string | null = null;

      if (category.technicalDirectorId === args.profileId) {
        role = "Technical Director";
      } else if (category.assistantCoachIds?.includes(args.profileId)) {
        role = "Assistant Coach";
      }

      if (role) {
        const club = await ctx.db.get(category.clubId);
        if (club) {
          assignments.push({
            categoryId: category._id,
            categoryName: category.name,
            clubName: club.name,
            role,
          });
        }
      }
    }

    return {
      profile: {
        _id: profile._id,
        displayName: profile.displayName,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        phoneNumber: profile.phoneNumber,
      },
      assignments,
    };
  },
});

/**
 * Remove staff member from a category
 */
export const removeFromCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    profileId: v.id("profiles"),
    role: v.union(
      v.literal("technical_director"),
      v.literal("assistant_coach"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    if (args.role === "technical_director") {
      if (category.technicalDirectorId !== args.profileId) {
        throw new Error(
          "Profile is not the technical director of this category",
        );
      }
      await ctx.db.patch(args.categoryId, {
        technicalDirectorId: undefined,
      });
    } else {
      const assistantCoachIds = category.assistantCoachIds || [];
      const updatedIds = assistantCoachIds.filter(
        (id) => id !== args.profileId,
      );

      if (assistantCoachIds.length === updatedIds.length) {
        throw new Error("Profile is not an assistant coach of this category");
      }

      await ctx.db.patch(args.categoryId, {
        assistantCoachIds: updatedIds,
      });
    }

    return null;
  },
});

/**
 * Get staff statistics
 */
export const getStatistics = query({
  args: { profileId: v.id("profiles") },
  returns: v.object({
    totalAssignments: v.number(),
    technicalDirectorCount: v.number(),
    assistantCoachCount: v.number(),
    totalPlayers: v.number(),
  }),
  handler: async (ctx, args) => {
    const allCategories = await ctx.db.query("categories").collect();

    let technicalDirectorCount = 0;
    let assistantCoachCount = 0;
    const categoryIds: Array<Id<"categories">> = [];

    for (const category of allCategories) {
      if (category.technicalDirectorId === args.profileId) {
        technicalDirectorCount++;
        categoryIds.push(category._id);
      } else if (category.assistantCoachIds?.includes(args.profileId)) {
        assistantCoachCount++;
        categoryIds.push(category._id);
      }
    }

    // Count total players across all categories this staff manages
    let totalPlayers = 0;
    for (const categoryId of categoryIds) {
      const players = await ctx.db
        .query("players")
        .withIndex("by_currentCategoryId", (q) =>
          q.eq("currentCategoryId", categoryId),
        )
        .collect();
      totalPlayers += players.length;
    }

    return {
      totalAssignments: technicalDirectorCount + assistantCoachCount,
      technicalDirectorCount,
      assistantCoachCount,
      totalPlayers,
    };
  },
});

/**
 * Add staff member to a category
 */
export const addToCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    email: v.string(),
    firstName: v.string(), // Added
    lastName: v.string(), // Added
    phoneNumber: v.optional(v.string()), // Added
    role: v.union(
      v.literal("technical_director"),
      v.literal("assistant_coach"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get the current user's profile to use as inviter
    const inviterProfile = await ctx.db
      .query("profiles")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const clubId = category.clubId;

    // Get club and league for redirect URL context
    const club = await ctx.db.get(clubId);
    if (!club) {
      throw new Error("Club not found");
    }
    const league = await ctx.db.get(club.leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    // 1. Find or Create Profile
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!profile) {
      // Create new profile
      const profileId = await ctx.db.insert("profiles", {
        clerkId: "", // Will be filled by action
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        displayName: `${args.firstName} ${args.lastName}`,
        phoneNumber: args.phoneNumber,
      });

      profile = await ctx.db.get(profileId);

      // Trigger Clerk organization invitation
      await ctx.scheduler.runAfter(0, internal.users.createClerkAccount, {
        profileId: profileId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        orgSlug: league.slug,
        teamSlug: club.slug,
        clerkOrgId: league.clerkOrgId,
        inviterUserId: inviterProfile?.clerkId,
        role: "org:technical_director",
      });
    }

    if (!profile) throw new Error("Unexpected error creating profile");

    // 2. Ensure they have the Base Role in the Club
    // Whether they are a TD or Assistant, they need "TechnicalDirector" access to the platform
    const existingRole = await ctx.db
      .query("roleAssignments")
      .withIndex("by_profileId_and_organizationId", (q) =>
        q.eq("profileId", profile!._id).eq("organizationId", clubId),
      )
      .first();

    if (!existingRole) {
      await ctx.db.insert("roleAssignments", {
        profileId: profile._id,
        role: "TechnicalDirector", // Base role for all coaching staff
        organizationId: clubId,
        organizationType: "club",
        assignedAt: Date.now(),
      });

      // Sync roles so they can login immediately
      await ctx.scheduler.runAfter(0, internal.users.syncRolesToClerk, {
        profileId: profile._id,
      });
    }

    // 3. Link to Category
    if (args.role === "technical_director") {
      if (
        category.technicalDirectorId &&
        category.technicalDirectorId !== profile._id
      ) {
        throw new Error("Category already has a technical director");
      }
      await ctx.db.patch(args.categoryId, {
        technicalDirectorId: profile._id,
      });
    } else {
      const assistantCoachIds = category.assistantCoachIds || [];
      // Prevent duplicates
      if (!assistantCoachIds.includes(profile._id)) {
        await ctx.db.patch(args.categoryId, {
          assistantCoachIds: [...assistantCoachIds, profile._id],
        });
      }
    }

    return null;
  },
});

/**
 * List all staff by league slug (includes LeagueAdmin and Referee roles)
 */
export const listAllByLeagueSlug = query({
  args: { leagueSlug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      league: v.object({
        _id: v.id("leagues"),
        name: v.string(),
      }),
      staff: v.array(
        v.object({
          _id: v.string(),
          profileId: v.id("profiles"),
          fullName: v.string(),
          email: v.string(),
          avatarUrl: v.optional(v.string()),
          role: v.string(),
          certificationLevel: v.optional(v.string()),
          zone: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      return null;
    }

    const staff: Array<{
      _id: string;
      profileId: Id<"profiles">;
      fullName: string;
      email: string;
      avatarUrl: string | undefined;
      role: string;
      certificationLevel: string | undefined;
      zone: string | undefined;
    }> = [];

    // Get LeagueAdmin assignments
    const leagueAdminAssignments = await ctx.db
      .query("roleAssignments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", league._id))
      .filter((q) => q.eq(q.field("role"), "LeagueAdmin"))
      .collect();

    for (const assignment of leagueAdminAssignments) {
      const profile = await ctx.db.get(assignment.profileId);
      if (profile) {
        staff.push({
          _id: assignment._id,
          profileId: assignment.profileId,
          fullName:
            profile.displayName ||
            `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
            profile.email,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          role: "admin",
          certificationLevel: undefined,
          zone: undefined,
        });
      }
    }

    // Get Referees
    const referees = await ctx.db
      .query("referees")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .collect();

    for (const referee of referees) {
      const profile = await ctx.db.get(referee.profileId);
      if (profile) {
        const exists = staff.some((s) => s.profileId === referee.profileId);
        if (!exists) {
          staff.push({
            _id: referee._id,
            profileId: referee.profileId,
            fullName:
              profile.displayName ||
              `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
              profile.email,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
            role: "referee",
            certificationLevel: referee.certificationLevel,
            zone: referee.zone,
          });
        }
      }
    }

    return {
      league: {
        _id: league._id,
        name: league.name,
      },
      staff,
    };
  },
});

/**
 * Add a league admin or referee to a league
 */
export const addLeagueAdmin = mutation({
  args: {
    leagueSlug: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("referee")),
  },
  returns: v.object({
    profileId: v.id("profiles"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const inviterProfile = await ctx.db
      .query("profiles")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      throw new Error("League not found");
    }

    const email = args.email.trim().toLowerCase();

    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    let created = false;

    if (!profile) {
      const profileId = await ctx.db.insert("profiles", {
        clerkId: "",
        email,
      });

      profile = await ctx.db.get(profileId);

      if (profile && inviterProfile) {
        await ctx.scheduler.runAfter(0, internal.users.createClerkAccount, {
          profileId: profile._id,
          email,
          firstName: "",
          lastName: "",
          orgSlug: args.leagueSlug,
          teamSlug: "",
          clerkOrgId: league.clerkOrgId,
          inviterUserId: inviterProfile.clerkId,
          role: args.role === "admin" ? "org:admin" : "org:member",
        });
      }

      created = true;
    } else {
      if (inviterProfile && profile) {
        await ctx.scheduler.runAfter(0, internal.users.createClerkAccount, {
          profileId: profile._id,
          email,
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          orgSlug: args.leagueSlug,
          teamSlug: "",
          clerkOrgId: league.clerkOrgId,
          inviterUserId: inviterProfile.clerkId,
          role: args.role === "admin" ? "org:admin" : "org:member",
        });
      }
    }

    if (!profile) {
      throw new Error("Failed to create profile");
    }

    if (args.role === "admin") {
      const existingRole = await ctx.db
        .query("roleAssignments")
        .withIndex("by_profileId_and_organizationId", (q) =>
          q.eq("profileId", profile!._id).eq("organizationId", league._id),
        )
        .filter((q) => q.eq(q.field("role"), "LeagueAdmin"))
        .unique();

      if (!existingRole) {
        await ctx.db.insert("roleAssignments", {
          profileId: profile._id,
          role: "LeagueAdmin",
          organizationId: league._id,
          organizationType: "league",
          assignedAt: Date.now(),
        });
      }
    } else if (args.role === "referee") {
      const existingReferee = await ctx.db
        .query("referees")
        .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
        .filter((q) => q.eq(q.field("profileId"), profile!._id))
        .unique();

      if (!existingReferee) {
        await ctx.db.insert("referees", {
          profileId: profile._id,
          leagueId: league._id,
          certificationLevel: "Level 1",
          status: "active",
        });
      }
    }

    return {
      profileId: profile._id,
      created,
    };
  },
});

/**
 * Remove a staff member from a league (admin or referee)
 */
export const removeLeagueStaff = mutation({
  args: {
    leagueSlug: v.string(),
    profileId: v.id("profiles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      throw new Error("League not found");
    }

    // Remove LeagueAdmin role assignment
    const adminAssignment = await ctx.db
      .query("roleAssignments")
      .withIndex("by_profileId_and_organizationId", (q) =>
        q.eq("profileId", args.profileId).eq("organizationId", league._id),
      )
      .filter((q) => q.eq(q.field("role"), "LeagueAdmin"))
      .unique();

    if (adminAssignment) {
      await ctx.db.delete(adminAssignment._id);
    }

    // Remove Referee entry
    const refereeEntry = await ctx.db
      .query("referees")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .filter((q) => q.eq(q.field("profileId"), args.profileId))
      .unique();

    if (refereeEntry) {
      await ctx.db.delete(refereeEntry._id);
    }

    return null;
  },
});
