import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roles = v.union(
  v.literal("SuperAdmin"),
  v.literal("Admin"),
  v.literal("Member"),
);

const mode = v.union(v.literal("base"), v.literal("custom"));

const status = v.union(
  v.literal("pending"),
  v.literal("reviewing"),
  v.literal("pre-admitted"),
  v.literal("admitted"),
  v.literal("denied"),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    isActive: v.boolean(),
  })
    .index("byClerkdId", ["clerkId"])
    .index("byEmail", ["email"])
    .index("activeUsers", ["isActive"]),

  userRoleAssigments: defineTable({
    userId: v.id("users"),
    role: roles,
  })
    .index("byUserId", ["userId"])
    .index("byRole", ["role"]),

  organizations: defineTable({
    organizationId: v.string(),
    name: v.string(),
    slug: v.string(),
  }).index("bySlug", ["slug"]),

  formTemplates: defineTable({
    organizationId: v.id("organizations"),
    version: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    mode: mode,
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
    isPublished: v.boolean(),
  }).index("byOrganization", ["organizationId"]),

  applications: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    formTemplateId: v.id("formTemplates"),
    formTemplateVersion: v.number(),
    applicationCode: v.string(),
    status: status,
    formData: v.record(
      v.string(),
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null()),
      ),
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
  })
    .index("byUserId", ["userId"])
    .index("byStatus", ["status"])
    .index("byApplicationCode", ["applicationCode"]),
});
