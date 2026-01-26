import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const orgMemberRole = v.union(
  v.literal("superadmin"),
  v.literal("admin"),
  v.literal("member"),
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
    isSuperAdmin: v.boolean(),
  })
    .index("byClerkId", ["clerkId"])
    .index("byEmail", ["email"])
    .index("activeUsers", ["isActive"]),

  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("byClerkOrgId", ["clerkOrgId"])
    .index("bySlug", ["slug"]),

  organizationMembers: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    clerkMembershipId: v.string(),
    role: orgMemberRole,
    createdAt: v.number(),
  })
    .index("byUserId", ["userId"])
    .index("byOrganization", ["organizationId"])
    .index("byUserAndOrg", ["userId", "organizationId"])
    .index("byClerkMembershipId", ["clerkMembershipId"]),

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
        v.union(
          v.string(),
          v.number(),
          v.boolean(),
          v.null(),
          v.id("_storage"),
        ),
      ),
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
  })
    .index("byUserId", ["userId"])
    .index("byOrganizationId", ["organizationId"])
    .index("byStatus", ["status"])
    .index("byApplicationCode", ["applicationCode"]),
});
