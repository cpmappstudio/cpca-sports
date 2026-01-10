import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Create a player profile (with or without email).
 * If email provided, Clerk account will be created automatically.
 */
export const createPlayer = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    categoryId: v.id("categories"),
    // Player-specific fields (soccer)
    soccerPosition: v.optional(
      v.union(
        v.literal("goalkeeper"),
        v.literal("defender"),
        v.literal("midfielder"),
        v.literal("forward"),
      ),
    ),
    sportType: v.optional(
      v.union(v.literal("soccer"), v.literal("basketball")),
    ),
    jerseyNumber: v.optional(v.number()),
    nationality: v.optional(v.string()),
  },
  returns: v.object({
    profileId: v.id("profiles"),
    playerId: v.id("players"),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify category exists and get club
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");

    const club = await ctx.db.get(category.clubId);
    if (!club) throw new Error("Club not found");

    // TODO: Add authorization check - only club admins can create players

    // If email provided, check if it's already in use
    if (args.email) {
      const email = args.email;
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();

      if (existing) {
        throw new Error("User with this email already exists");
      }
    }

    // Create profile
    const profileId = await ctx.db.insert("profiles", {
      clerkId: "",
      email: args.email ?? "",
      firstName: args.firstName,
      lastName: args.lastName,
      displayName: `${args.firstName} ${args.lastName}`,
      phoneNumber: args.phoneNumber,
      dateOfBirth: args.dateOfBirth,
    });

    // Create player record
    const playerId = await ctx.db.insert("players", {
      profileId,
      currentCategoryId: args.categoryId,
      soccerPosition: args.soccerPosition,
      sportType: args.sportType ?? "soccer",
      jerseyNumber: args.jerseyNumber,
      nationality: args.nationality,
      status: "active",
      joinedDate: new Date().toISOString(),
    });

    // Assign Player role
    await ctx.db.insert("roleAssignments", {
      profileId,
      role: "Player",
      organizationId: club._id,
      organizationType: "club",
      assignedAt: Date.now(),
    });

    // If email was provided, create Clerk account
    if (args.email && args.firstName && args.lastName) {
      await ctx.scheduler.runAfter(
        0,
        internal.players.createClerkAccountForPlayer,
        {
          profileId,
          email: args.email,
          firstName: args.firstName,
          lastName: args.lastName,
        },
      );
    }

    return { profileId, playerId };
  },
});

/**
 * Update player email and trigger Clerk account creation if needed.
 */
export const updatePlayerEmail = mutation({
  args: {
    playerId: v.id("players"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // TODO: Add authorization check

    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");

    const profile = await ctx.db.get(player.profileId);
    if (!profile) throw new Error("Profile not found");

    // Check if email is already taken
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing && existing._id !== profile._id) {
      throw new Error("Email already in use");
    }

    // Update email
    await ctx.db.patch(player.profileId, {
      email: args.email,
    });

    // If profile doesn't have Clerk account yet, create it
    if (!profile.clerkId && profile.firstName && profile.lastName) {
      await ctx.scheduler.runAfter(
        0,
        internal.players.createClerkAccountForPlayer,
        {
          profileId: player.profileId,
          email: args.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
        },
      );
    }

    return null;
  },
});

/**
 * Update player details
 */
export const updatePlayer = mutation({
  args: {
    playerId: v.id("players"),
    soccerPosition: v.optional(
      v.union(
        v.literal("goalkeeper"),
        v.literal("defender"),
        v.literal("midfielder"),
        v.literal("forward"),
      ),
    ),
    jerseyNumber: v.optional(v.number()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    preferredFoot: v.optional(
      v.union(v.literal("left"), v.literal("right"), v.literal("both")),
    ),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("injured"),
        v.literal("on_loan"),
        v.literal("inactive"),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // TODO: Add authorization check

    const { playerId, ...updates } = args;

    await ctx.db.patch(playerId, updates);

    return null;
  },
});

/**
 * Transfer player to another category
 */
export const transferPlayer = mutation({
  args: {
    playerId: v.id("players"),
    toCategoryId: v.id("categories"),
    transferType: v.union(
      v.literal("promotion"),
      v.literal("transfer"),
      v.literal("loan"),
      v.literal("trial"),
    ),
    fee: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("playerTransfers"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // TODO: Add authorization check

    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");

    const toCategory = await ctx.db.get(args.toCategoryId);
    if (!toCategory) throw new Error("Target category not found");

    // Create transfer record
    const transferId = await ctx.db.insert("playerTransfers", {
      playerId: args.playerId,
      fromCategoryId: player.currentCategoryId,
      toCategoryId: args.toCategoryId,
      transferDate: new Date().toISOString(),
      transferType: args.transferType,
      fee: args.fee,
      notes: args.notes,
    });

    // Update player's current category
    await ctx.db.patch(args.playerId, {
      currentCategoryId: args.toCategoryId,
    });

    return transferId;
  },
});

/**
 * List players by club slug with club metadata
 * Optimized: Single query, batch fetches profiles and categories
 * Returns null if club not found
 */
export const listByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.union(
    v.object({
      club: v.object({
        _id: v.id("clubs"),
        name: v.string(),
        slug: v.string(),
      }),
      players: v.array(
        v.object({
          _id: v.id("players"),
          _creationTime: v.number(),
          profileId: v.id("profiles"),
          fullName: v.string(),
          avatarUrl: v.optional(v.string()),
          dateOfBirth: v.optional(v.string()),
          position: v.optional(
            v.union(
              v.literal("goalkeeper"),
              v.literal("defender"),
              v.literal("midfielder"),
              v.literal("forward"),
            ),
          ),
          jerseyNumber: v.optional(v.number()),
          status: v.union(
            v.literal("active"),
            v.literal("injured"),
            v.literal("on_loan"),
            v.literal("inactive"),
          ),
          currentCategoryId: v.optional(v.id("categories")),
          categoryName: v.optional(v.string()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) {
      return null;
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    if (categories.length === 0) {
      return {
        club: { _id: club._id, name: club.name, slug: club.slug },
        players: [],
      };
    }

    // Create category map for O(1) lookup
    const categoryMap = new Map(categories.map((c) => [c._id, c]));

    // Fetch all players for all categories in parallel
    const playersPerCategory = await Promise.all(
      categories.map((category) =>
        ctx.db
          .query("players")
          .withIndex("by_currentCategoryId", (q) =>
            q.eq("currentCategoryId", category._id),
          )
          .collect(),
      ),
    );

    // Flatten all players
    const allPlayers = playersPerCategory.flat();

    if (allPlayers.length === 0) {
      return {
        club: { _id: club._id, name: club.name, slug: club.slug },
        players: [],
      };
    }

    // Batch fetch all profiles
    const profileIds = [...new Set(allPlayers.map((p) => p.profileId))];
    const profiles = await Promise.all(profileIds.map((id) => ctx.db.get(id)));
    const profileMap = new Map(profileIds.map((id, i) => [id, profiles[i]]));

    // Map to result format
    const players = allPlayers.map((player) => {
      const profile = profileMap.get(player.profileId);
      const category = player.currentCategoryId
        ? categoryMap.get(player.currentCategoryId)
        : undefined;

      return {
        _id: player._id,
        _creationTime: player._creationTime,
        profileId: player.profileId,
        fullName: profile?.displayName || profile?.email || "Unknown",
        avatarUrl: profile?.avatarUrl,
        dateOfBirth: profile?.dateOfBirth,
        position: player.soccerPosition,
        jerseyNumber: player.jerseyNumber,
        status: player.status,
        currentCategoryId: player.currentCategoryId,
        categoryName: category?.name,
      };
    });

    return {
      club: { _id: club._id, name: club.name, slug: club.slug },
      players,
    };
  },
});

/**
 * List all players in a league (across all affiliated clubs).
 * READ-ONLY view for League Admins.
 */
export const listByLeagueSlug = query({
  args: { leagueSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("players"),
      _creationTime: v.number(),
      profileId: v.id("profiles"),
      fullName: v.string(),
      avatarUrl: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      position: v.optional(v.string()), // simplified type for brevity
      status: v.string(), // simplified
      clubName: v.string(),
      clubLogoUrl: v.optional(v.string()),
      categoryName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) return [];

    const clubs = await ctx.db
      .query("clubs")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .collect();

    const results = [];

    // Note: In a high-scale production app, we would denormalize "leagueId" onto the player
    // or use a dedicated search index. For now, this iteration is acceptable.
    for (const club of clubs) {
      const categories = await ctx.db
        .query("categories")
        .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
        .collect();

      for (const category of categories) {
        const players = await ctx.db
          .query("players")
          .withIndex("by_currentCategoryId", (q) =>
            q.eq("currentCategoryId", category._id),
          )
          .collect();

        for (const player of players) {
          const profile = await ctx.db.get(player.profileId);
          if (profile) {
            results.push({
              _id: player._id,
              _creationTime: player._creationTime,
              profileId: player.profileId,
              fullName: profile.displayName || profile.email || "Unknown",
              avatarUrl: profile.avatarUrl,
              dateOfBirth: profile.dateOfBirth,
              position: player.soccerPosition,
              status: player.status,
              clubName: club.name,
              clubLogoUrl: club.logoUrl,
              categoryName: category.name,
            });
          }
        }
      }
    }

    // Sort by Club Name then Player Name
    return results.sort(
      (a, b) =>
        a.clubName.localeCompare(b.clubName) ||
        a.fullName.localeCompare(b.fullName),
    );
  },
});

/**
 * Get player by ID with full details
 */
export const getById = query({
  args: { playerId: v.id("players") },
  returns: v.union(
    v.object({
      _id: v.id("players"),
      _creationTime: v.number(),
      profileId: v.id("profiles"),
      currentCategoryId: v.optional(v.id("categories")),
      position: v.optional(
        v.union(
          v.literal("goalkeeper"),
          v.literal("defender"),
          v.literal("midfielder"),
          v.literal("forward"),
        ),
      ),
      jerseyNumber: v.optional(v.number()),
      height: v.optional(v.number()),
      weight: v.optional(v.number()),
      preferredFoot: v.optional(
        v.union(v.literal("left"), v.literal("right"), v.literal("both")),
      ),
      status: v.union(
        v.literal("active"),
        v.literal("injured"),
        v.literal("on_loan"),
        v.literal("inactive"),
      ),
      nationality: v.optional(v.string()),
      secondNationality: v.optional(v.string()),
      joinedDate: v.optional(v.string()),
      profileData: v.optional(
        v.object({
          displayName: v.optional(v.string()),
          email: v.string(),
          avatarUrl: v.optional(v.string()),
          dateOfBirth: v.optional(v.string()),
          phoneNumber: v.optional(v.string()),
        }),
      ),
      categoryData: v.optional(
        v.object({
          name: v.string(),
          clubName: v.string(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      return null;
    }

    const profile = await ctx.db.get(player.profileId);

    let categoryData;
    if (player.currentCategoryId) {
      const category = await ctx.db.get(player.currentCategoryId);
      if (category) {
        const club = await ctx.db.get(category.clubId);
        categoryData = {
          name: category.name,
          clubName: club?.name || "Unknown",
        };
      }
    }

    return {
      ...player,
      profileData: profile
        ? {
            displayName: profile.displayName,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
            dateOfBirth: profile.dateOfBirth,
            phoneNumber: profile.phoneNumber,
          }
        : undefined,
      categoryData,
    };
  },
});

/**
 * List players by category ID
 */
export const listByCategoryId = query({
  args: { categoryId: v.id("categories") },
  returns: v.array(
    v.object({
      _id: v.id("players"),
      _creationTime: v.number(),
      profileId: v.id("profiles"),
      fullName: v.string(),
      avatarUrl: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      position: v.optional(
        v.union(
          v.literal("goalkeeper"),
          v.literal("defender"),
          v.literal("midfielder"),
          v.literal("forward"),
        ),
      ),
      jerseyNumber: v.optional(v.number()),
      status: v.union(
        v.literal("active"),
        v.literal("injured"),
        v.literal("on_loan"),
        v.literal("inactive"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_currentCategoryId", (q) =>
        q.eq("currentCategoryId", args.categoryId),
      )
      .collect();

    const enrichedPlayers: Array<{
      _id: Id<"players">;
      _creationTime: number;
      profileId: Id<"profiles">;
      fullName: string;
      avatarUrl: string | undefined;
      dateOfBirth: string | undefined;
      position:
        | "goalkeeper"
        | "defender"
        | "midfielder"
        | "forward"
        | undefined;
      jerseyNumber: number | undefined;
      status: "active" | "injured" | "on_loan" | "inactive";
    }> = await Promise.all(
      players.map(async (player) => {
        const profile = await ctx.db.get(player.profileId);

        return {
          _id: player._id,
          _creationTime: player._creationTime,
          profileId: player.profileId,
          fullName: profile?.displayName || profile?.email || "Unknown",
          avatarUrl: profile?.avatarUrl,
          dateOfBirth: profile?.dateOfBirth,
          position: player.soccerPosition,
          jerseyNumber: player.jerseyNumber,
          status: player.status,
        };
      }),
    );

    return enrichedPlayers;
  },
});

/**
 * Internal mutation to link Clerk account to player profile
 */
export const linkClerkAccountToPlayer = internalMutation({
  args: {
    profileId: v.id("profiles"),
    clerkId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.profileId, {
      clerkId: args.clerkId,
    });
    return null;
  },
});

/**
 * Internal action to create Clerk account for player
 */
export const createClerkAccountForPlayer = internalMutation({
  args: {
    profileId: v.id("profiles"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // This will be called by the action created in users.ts
    // Just a placeholder for now
    return null;
  },
});

/**
 * Delete a player
 */
export const deletePlayer = mutation({
  args: { playerId: v.id("players") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Delete role assignments
    const roleAssignments = await ctx.db
      .query("roleAssignments")
      .withIndex("by_profileId", (q) => q.eq("profileId", player.profileId))
      .collect();

    for (const assignment of roleAssignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete player
    await ctx.db.delete(args.playerId);

    return null;
  },
});

/**
 * Get player statistics
 */
export const getStatistics = query({
  args: { playerId: v.id("players") },
  returns: v.object({
    transfersCount: v.number(),
    // Match statistics will be added later when match tables exist
    matchesPlayed: v.number(),
    goalsScored: v.number(),
    assists: v.number(),
    yellowCards: v.number(),
    redCards: v.number(),
  }),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Count transfers
    const transfers = await ctx.db
      .query("playerTransfers")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    const soccerStats = player.soccerStats;

    return {
      transfersCount: transfers.length,
      matchesPlayed: soccerStats?.matchesPlayed ?? 0,
      goalsScored: soccerStats?.goals ?? 0,
      assists: soccerStats?.assists ?? 0,
      yellowCards: soccerStats?.yellowCards ?? 0,
      redCards: soccerStats?.redCards ?? 0,
    };
  },
});

/**
 * List player transfers
 */
export const listTransfers = query({
  args: { playerId: v.id("players") },
  returns: v.array(
    v.object({
      _id: v.id("playerTransfers"),
      _creationTime: v.number(),
      fromCategoryName: v.string(),
      toCategoryName: v.string(),
      transferDate: v.string(),
      transferType: v.union(
        v.literal("promotion"),
        v.literal("transfer"),
        v.literal("loan"),
        v.literal("trial"),
      ),
      fee: v.optional(v.number()),
      notes: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const transfers = await ctx.db
      .query("playerTransfers")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .order("desc")
      .collect();

    const enrichedTransfers: Array<{
      _id: Id<"playerTransfers">;
      _creationTime: number;
      fromCategoryName: string;
      toCategoryName: string;
      transferDate: string;
      transferType: "promotion" | "transfer" | "loan" | "trial";
      fee: number | undefined;
      notes: string | undefined;
    }> = [];

    for (const transfer of transfers) {
      const fromCategory = transfer.fromCategoryId
        ? await ctx.db.get(transfer.fromCategoryId)
        : null;
      const toCategory = await ctx.db.get(transfer.toCategoryId);

      enrichedTransfers.push({
        _id: transfer._id,
        _creationTime: transfer._creationTime,
        fromCategoryName: fromCategory?.name || "Unknown",
        toCategoryName: toCategory?.name || "Unknown",
        transferDate: transfer.transferDate,
        transferType: transfer.transferType,
        fee: transfer.fee,
        notes: transfer.notes,
      });
    }

    return enrichedTransfers;
  },
});

/**
 * List basketball players by club slug with basketball-specific fields
 * Returns player data optimized for basketball player cards
 */
export const listBasketballPlayersByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.union(
    v.object({
      club: v.object({
        _id: v.id("clubs"),
        name: v.string(),
        slug: v.string(),
      }),
      players: v.array(
        v.object({
          _id: v.id("players"),
          profileId: v.id("profiles"),
          fullName: v.string(),
          firstName: v.optional(v.string()),
          lastName: v.optional(v.string()),
          avatarUrl: v.optional(v.string()),
          dateOfBirth: v.optional(v.string()),
          jerseyNumber: v.optional(v.number()),
          position: v.optional(
            v.union(
              v.literal("point_guard"),
              v.literal("shooting_guard"),
              v.literal("small_forward"),
              v.literal("power_forward"),
              v.literal("center"),
            ),
          ),
          status: v.union(
            v.literal("active"),
            v.literal("injured"),
            v.literal("on_loan"),
            v.literal("inactive"),
          ),
          height: v.optional(v.number()),
          weight: v.optional(v.number()),
          nationality: v.optional(v.string()),
          yearsExperience: v.optional(v.number()),
          stats: v.optional(
            v.object({
              gamesPlayed: v.number(),
              pointsPerGame: v.number(),
              assistsPerGame: v.number(),
              reboundsPerGame: v.number(),
            }),
          ),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) {
      return null;
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    if (categories.length === 0) {
      return {
        club: { _id: club._id, name: club.name, slug: club.slug },
        players: [],
      };
    }

    const categoryMap = new Map(categories.map((c) => [c._id, c]));

    const playersPerCategory = await Promise.all(
      categories.map((category) =>
        ctx.db
          .query("players")
          .withIndex("by_currentCategoryId", (q) =>
            q.eq("currentCategoryId", category._id),
          )
          .filter((q) => q.eq(q.field("sportType"), "basketball"))
          .collect(),
      ),
    );

    const allPlayers = playersPerCategory.flat();

    if (allPlayers.length === 0) {
      return {
        club: { _id: club._id, name: club.name, slug: club.slug },
        players: [],
      };
    }

    const profileIds = [...new Set(allPlayers.map((p) => p.profileId))];
    const profiles = await Promise.all(profileIds.map((id) => ctx.db.get(id)));
    const profileMap = new Map(profileIds.map((id, i) => [id, profiles[i]]));

    const players = allPlayers.map((player) => {
      const profile = profileMap.get(player.profileId);
      const firstName = profile?.firstName;
      const lastName = profile?.lastName;
      const fullName =
        profile?.displayName ||
        [firstName, lastName].filter(Boolean).join(" ") ||
        profile?.email ||
        "Unknown";

      const joinedDate = player.joinedDate
        ? new Date(player.joinedDate)
        : undefined;
      const yearsExperience = joinedDate
        ? Math.floor(
            (Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 365),
          )
        : undefined;

      const basketballStats = player.basketballStats;
      const stats = basketballStats
        ? {
            gamesPlayed: basketballStats.gamesPlayed,
            pointsPerGame:
              basketballStats.gamesPlayed > 0
                ? Math.round(
                    (basketballStats.points / basketballStats.gamesPlayed) * 10,
                  ) / 10
                : 0,
            assistsPerGame:
              basketballStats.gamesPlayed > 0
                ? Math.round(
                    (basketballStats.assists / basketballStats.gamesPlayed) *
                      10,
                  ) / 10
                : 0,
            reboundsPerGame:
              basketballStats.gamesPlayed > 0
                ? Math.round(
                    (basketballStats.rebounds / basketballStats.gamesPlayed) *
                      10,
                  ) / 10
                : 0,
          }
        : undefined;

      return {
        _id: player._id,
        profileId: player.profileId,
        fullName,
        firstName,
        lastName,
        avatarUrl: profile?.avatarUrl,
        dateOfBirth: profile?.dateOfBirth,
        jerseyNumber: player.jerseyNumber,
        position: player.basketballPosition,
        status: player.status,
        height: player.height,
        weight: player.weight,
        nationality: player.nationality,
        yearsExperience,
        stats,
      };
    });

    return {
      club: { _id: club._id, name: club.name, slug: club.slug },
      players,
    };
  },
});

/**
 * Seed mutation to create test basketball players for development
 * This should only be used in development environments
 * Creates full structure: league -> club -> category -> players
 */
export const seedBasketballPlayers = mutation({
  args: {
    clubSlug: v.optional(v.string()),
  },
  returns: v.object({
    created: v.number(),
    playerIds: v.array(v.id("players")),
    clubSlug: v.string(),
  }),
  handler: async (ctx, args) => {
    const targetSlug = args.clubSlug ?? "test-bulls";

    let club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", targetSlug))
      .unique();

    if (!club) {
      let league = await ctx.db
        .query("leagues")
        .withIndex("by_slug", (q) => q.eq("slug", "test-league"))
        .unique();

      if (!league) {
        const leagueId = await ctx.db.insert("leagues", {
          name: "Test Basketball League",
          slug: "test-league",
          country: "USA",
          sportType: "basketball",
          status: "active",
        });
        league = await ctx.db.get(leagueId);
      }

      if (!league) {
        throw new Error("Failed to create league");
      }

      const clubId = await ctx.db.insert("clubs", {
        name: "Chicago Test Bulls",
        slug: targetSlug,
        shortName: "Bulls",
        leagueId: league._id,
        status: "affiliated",
      });

      club = await ctx.db.get(clubId);
    }

    if (!club) {
      throw new Error("Failed to create or find club");
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    let categoryId: Id<"categories">;

    if (categories.length === 0) {
      categoryId = await ctx.db.insert("categories", {
        clubId: club._id,
        name: "Senior Team",
        ageGroup: "Senior",
        gender: "male",
        status: "active",
      });
    } else {
      categoryId = categories[0]._id;
    }

    const testPlayers = [
      {
        firstName: "Trentyn",
        lastName: "Flowers",
        dateOfBirth: "2004-03-15",
        jerseyNumber: 0,
        position: "small_forward" as const,
        height: 206,
        weight: 84,
        nationality: "USA",
        stats: {
          points: 4,
          rebounds: 1,
          assists: 1,
          steals: 0,
          blocks: 0,
          gamesPlayed: 2,
        },
      },
      {
        firstName: "Marcus",
        lastName: "Thompson",
        dateOfBirth: "2001-07-22",
        jerseyNumber: 23,
        position: "point_guard" as const,
        height: 188,
        weight: 82,
        nationality: "USA",
        stats: {
          points: 45,
          rebounds: 8,
          assists: 24,
          steals: 5,
          blocks: 1,
          gamesPlayed: 5,
        },
      },
    ];

    const playerIds: Id<"players">[] = [];

    for (const testPlayer of testPlayers) {
      const profileId = await ctx.db.insert("profiles", {
        clerkId: "",
        email: `${testPlayer.firstName.toLowerCase()}.${testPlayer.lastName.toLowerCase()}@test.local`,
        firstName: testPlayer.firstName,
        lastName: testPlayer.lastName,
        displayName: `${testPlayer.firstName} ${testPlayer.lastName}`,
        dateOfBirth: testPlayer.dateOfBirth,
      });

      const playerId = await ctx.db.insert("players", {
        profileId,
        currentCategoryId: categoryId,
        sportType: "basketball",
        basketballPosition: testPlayer.position,
        jerseyNumber: testPlayer.jerseyNumber,
        height: testPlayer.height,
        weight: testPlayer.weight,
        nationality: testPlayer.nationality,
        status: "active",
        joinedDate: new Date().toISOString(),
        basketballStats: testPlayer.stats,
      });

      playerIds.push(playerId);
    }

    return {
      created: playerIds.length,
      playerIds,
      clubSlug: club.slug,
    };
  },
});

/**
 * Update test players with avatar URLs for development testing
 */
export const updateTestPlayersWithAvatars = mutation({
  args: {
    clubSlug: v.string(),
  },
  returns: v.object({
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) {
      throw new Error(`Club with slug "${args.clubSlug}" not found`);
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    if (categories.length === 0) {
      return { updated: 0 };
    }

    const testAvatars = [
      "https://cdn.nba.com/headshots/nba/latest/1040x760/1642280.png",
      "https://cdn.nba.com/headshots/nba/latest/1040x760/1628369.png",
    ];

    let updated = 0;

    for (const category of categories) {
      const players = await ctx.db
        .query("players")
        .withIndex("by_currentCategoryId", (q) =>
          q.eq("currentCategoryId", category._id),
        )
        .filter((q) => q.eq(q.field("sportType"), "basketball"))
        .collect();

      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const avatarUrl = testAvatars[i % testAvatars.length];

        await ctx.db.patch(player.profileId, {
          avatarUrl,
        });

        updated++;
      }
    }

    return { updated };
  },
});
