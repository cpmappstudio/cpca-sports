import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

const sectionValidator = v.object({
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
});

const templateValidator = v.object({
  _id: v.id("formTemplates"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  version: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  mode: v.union(v.literal("base"), v.literal("custom")),
  sections: v.array(sectionValidator),
  isPublished: v.boolean(),
});

/**
 * Get the published form template for an organization.
 * Used by the preadmission form to render dynamic fields.
 */
export const getPublished = query({
  args: { organizationSlug: v.string() },
  returns: v.union(templateValidator, v.null()),
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.organizationSlug))
      .unique();

    if (!organization) {
      return null;
    }

    const template = await ctx.db
      .query("formTemplates")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .filter((q) => q.eq(q.field("isPublished"), true))
      .first();

    return template;
  },
});

/**
 * Get all form templates for an organization (admin).
 */
export const listByOrganization = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(templateValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("formTemplates")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
  },
});

/**
 * Get a specific template by ID.
 */
export const getById = query({
  args: { templateId: v.id("formTemplates") },
  returns: v.union(templateValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

/**
 * Create a new form template (admin only).
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    mode: v.union(v.literal("base"), v.literal("custom")),
    sections: v.array(sectionValidator),
  },
  returns: v.id("formTemplates"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existingTemplates = await ctx.db
      .query("formTemplates")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    const maxVersion = existingTemplates.reduce(
      (max, t) => Math.max(max, t.version),
      0,
    );

    return await ctx.db.insert("formTemplates", {
      organizationId: args.organizationId,
      version: maxVersion + 1,
      name: args.name,
      description: args.description,
      mode: args.mode,
      sections: args.sections,
      isPublished: false,
    });
  },
});

/**
 * Update a form template (admin only).
 * Creates a new version if the template was already published.
 */
export const update = mutation({
  args: {
    templateId: v.id("formTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("base"), v.literal("custom"))),
    sections: v.optional(v.array(sectionValidator)),
  },
  returns: v.id("formTemplates"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.isPublished) {
      const newTemplateId = await ctx.db.insert("formTemplates", {
        organizationId: template.organizationId,
        version: template.version + 1,
        name: args.name ?? template.name,
        description: args.description ?? template.description,
        mode: args.mode ?? template.mode,
        sections: args.sections ?? template.sections,
        isPublished: false,
      });
      return newTemplateId;
    }

    await ctx.db.patch(args.templateId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.mode && { mode: args.mode }),
      ...(args.sections && { sections: args.sections }),
    });

    return args.templateId;
  },
});

/**
 * Publish a form template (admin only).
 * Unpublishes any previously published template for the same organization.
 */
export const publish = mutation({
  args: { templateId: v.id("formTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const publishedTemplates = await ctx.db
      .query("formTemplates")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", template.organizationId),
      )
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    for (const published of publishedTemplates) {
      await ctx.db.patch(published._id, { isPublished: false });
    }

    await ctx.db.patch(args.templateId, { isPublished: true });

    return null;
  },
});

/**
 * Get or create base template for organization (admin only).
 * Ensures organization always has a base template available.
 */
export const getOrCreateBase = mutation({
  args: { organizationSlug: v.string() },
  returns: templateValidator,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const organization = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.organizationSlug))
      .unique();

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Check if base template exists
    const existing = await ctx.db
      .query("formTemplates")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .filter((q) => q.eq(q.field("mode"), "base"))
      .first();

    if (existing) {
      return existing;
    }

    // Create base template with pre-admission structure
    const templateId = await ctx.db.insert("formTemplates", {
      organizationId: organization._id,
      version: 1,
      name: "Pre-Admission Form",
      description: "Standard pre-admission form for athletes",
      mode: "base",
      sections: [
        {
          key: "personal",
          label: "Personal Information",
          order: 1,
          fields: [
            { key: "firstName", label: "First Name", type: "text", required: true },
            { key: "lastName", label: "Last Name", type: "text", required: true },
            { key: "email", label: "Email", type: "email", required: true },
            { key: "telephone", label: "Phone", type: "tel", required: true },
            { key: "birthDate", label: "Date of Birth", type: "date", required: true },
            { key: "sex", label: "Gender", type: "select", required: true },
            { key: "height", label: "Height (cm)", type: "number", required: false },
            { key: "weight", label: "Weight (kg)", type: "number", required: false },
          ],
        },
        {
          key: "academic",
          label: "Academic Information",
          order: 2,
          fields: [
            { key: "currentSchoolName", label: "Current School", type: "text", required: true },
            { key: "gradeEntering", label: "Grade Entering", type: "select", required: true },
            { key: "graduationYear", label: "Graduation Year", type: "number", required: true },
            { key: "currentGPA", label: "Current GPA", type: "number", required: false },
          ],
        },
        {
          key: "sports",
          label: "Sports Information",
          order: 3,
          fields: [
            { key: "sport", label: "Sport", type: "select", required: true },
            { key: "program", label: "Program", type: "select", required: true },
            { key: "format", label: "Format", type: "select", required: true },
            { key: "highlightsLink", label: "Highlights Video Link", type: "url", required: false },
          ],
        },
        {
          key: "parents",
          label: "Parent/Guardian Information",
          order: 4,
          fields: [
            { key: "parentName", label: "Parent/Guardian Name", type: "text", required: true },
            { key: "parent1Relationship", label: "Relationship", type: "text", required: true },
            { key: "parentEmail", label: "Email", type: "email", required: true },
            { key: "parentTelephone", label: "Phone", type: "tel", required: true },
            { key: "parent2Name", label: "Second Parent/Guardian (Optional)", type: "text", required: false },
          ],
        },
        {
          key: "address",
          label: "Address Information",
          order: 5,
          fields: [
            { key: "streetAddress", label: "Street Address", type: "text", required: true },
            { key: "city", label: "City", type: "text", required: true },
            { key: "state", label: "State/Province", type: "text", required: true },
            { key: "zipCode", label: "ZIP/Postal Code", type: "text", required: true },
            { key: "country", label: "Country", type: "text", required: true },
          ],
        },
      ],
      isPublished: true,
    });

    const template = await ctx.db.get(templateId);
    if (!template) {
      throw new Error("Failed to create template");
    }

    return template;
  },
});
