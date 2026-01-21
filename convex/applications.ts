import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireAdmin } from "./lib/auth";
import { formDataValidator, applicationStatus } from "./lib/validators";

const applicationValidator = v.object({
  _id: v.id("applications"),
  _creationTime: v.number(),
  userId: v.id("users"),
  organizationId: v.id("organizations"),
  formTemplateId: v.id("formTemplates"),
  formTemplateVersion: v.number(),
  applicationCode: v.string(),
  status: applicationStatus,
  formData: formDataValidator,
  reviewedBy: v.optional(v.id("users")),
  reviewedAt: v.optional(v.number()),
});

/**
 * Generate a unique application code.
 */
function generateApplicationCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `APP-${timestamp}-${random}`;
}

/**
 * Submit a new application (authenticated user).
 */
export const submit = mutation({
  args: {
    organizationSlug: v.string(),
    formData: formDataValidator,
  },
  returns: v.object({
    applicationId: v.id("applications"),
    applicationCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const organization = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.organizationSlug))
      .unique();

    if (!organization) {
      throw new Error("Organization not found");
    }

    const template = await ctx.db
      .query("formTemplates")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .filter((q) => q.eq(q.field("isPublished"), true))
      .first();

    if (!template) {
      throw new Error("No published form template found for this organization");
    }

    const applicationCode = generateApplicationCode();

    const existing = await ctx.db
      .query("applications")
      .withIndex("byApplicationCode", (q) =>
        q.eq("applicationCode", applicationCode),
      )
      .unique();

    if (existing) {
      throw new Error("Application code collision. Please try again.");
    }

    const applicationId = await ctx.db.insert("applications", {
      userId: user._id,
      organizationId: organization._id,
      formTemplateId: template._id,
      formTemplateVersion: template.version,
      applicationCode,
      status: "pending",
      formData: args.formData,
    });

    return {
      applicationId,
      applicationCode,
    };
  },
});

/**
 * Get my applications (authenticated user).
 */
export const listMine = query({
  args: {},
  returns: v.array(applicationValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    return await ctx.db
      .query("applications")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/**
 * Get applications by organization (admin only).
 */
export const listByOrganization = query({
  args: {
    organizationSlug: v.string(),
    status: v.optional(applicationStatus),
  },
  returns: v.array(applicationValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const organization = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.organizationSlug))
      .unique();

    if (!organization) {
      return [];
    }

    const templates = await ctx.db
      .query("formTemplates")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .collect();

    const templateIds = new Set(templates.map((t) => t._id));

    let applications = await ctx.db.query("applications").order("desc").collect();

    applications = applications.filter((app) =>
      templateIds.has(app.formTemplateId),
    );

    if (args.status) {
      applications = applications.filter((app) => app.status === args.status);
    }

    return applications;
  },
});

/**
 * Get a single application by ID.
 * User can only access their own applications.
 * Admins can access any application.
 */
export const getById = query({
  args: { applicationId: v.id("applications") },
  returns: v.union(applicationValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      return null;
    }

    const userRole = await ctx.db
      .query("userRoleAssigments")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .first();

    const isAdmin =
      userRole?.role === "Admin" || userRole?.role === "SuperAdmin";

    if (application.userId !== user._id && !isAdmin) {
      throw new Error("Unauthorized: Cannot access this application");
    }

    return application;
  },
});

/**
 * Get application by code (for lookup after submission).
 */
export const getByCode = query({
  args: { applicationCode: v.string() },
  returns: v.union(applicationValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const application = await ctx.db
      .query("applications")
      .withIndex("byApplicationCode", (q) =>
        q.eq("applicationCode", args.applicationCode),
      )
      .unique();

    if (!application) {
      return null;
    }

    if (application.userId !== user._id) {
      const userRole = await ctx.db
        .query("userRoleAssigments")
        .withIndex("byUserId", (q) => q.eq("userId", user._id))
        .first();

      const isAdmin =
        userRole?.role === "Admin" || userRole?.role === "SuperAdmin";

      if (!isAdmin) {
        throw new Error("Unauthorized: Cannot access this application");
      }
    }

    return application;
  },
});

/**
 * Update application status (admin only).
 */
export const updateStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: applicationStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    await ctx.db.patch(args.applicationId, {
      status: args.status,
      reviewedBy: admin._id,
      reviewedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get application with template info (for detail view).
 */
export const getWithTemplate = query({
  args: { applicationId: v.id("applications") },
  returns: v.union(
    v.object({
      application: applicationValidator,
      template: v.object({
        _id: v.id("formTemplates"),
        name: v.string(),
        sections: v.array(
          v.object({
            key: v.string(),
            label: v.string(),
            order: v.number(),
            fields: v.array(
              v.object({
                key: v.string(),
                label: v.string(),
                type: v.string(),
                required: v.boolean(),
              }),
            ),
          }),
        ),
      }),
      organization: v.object({
        _id: v.id("organizations"),
        name: v.string(),
        slug: v.string(),
      }),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      return null;
    }

    const userRole = await ctx.db
      .query("userRoleAssigments")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .first();

    const isAdmin =
      userRole?.role === "Admin" || userRole?.role === "SuperAdmin";

    if (application.userId !== user._id && !isAdmin) {
      throw new Error("Unauthorized");
    }

    const template = await ctx.db.get(application.formTemplateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const organization = await ctx.db.get(application.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    return {
      application,
      template: {
        _id: template._id,
        name: template.name,
        sections: template.sections,
      },
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
    };
  },
});
