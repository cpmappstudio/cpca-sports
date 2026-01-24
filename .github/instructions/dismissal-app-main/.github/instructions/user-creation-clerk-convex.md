# User Creation with Clerk + Convex - Research Document

> **Purpose**: This document captures research findings for implementing user creation in the CPM Payments app. It compares the Dismissal app pattern with Clerk Organizations best practices.
>
> **Sources**:
> - [Clerk Organizations Overview](https://clerk.com/docs/guides/organizations/overview)
> - [Convex Database Auth](https://docs.convex.dev/auth/database-auth)
> - [Clerk Webhooks: Data Sync with Convex](https://clerk.com/blog/webhooks-data-sync-convex)
> - [Clerk Custom Roles and Permissions](https://clerk.com/docs/organizations/create-roles-permissions)
> - [Clerk Multi-tenant Architecture](https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture)

---

## Part 1: Dismissal App Analysis

### Architecture Overview

```
ADMIN INTERFACE (Frontend)
    ↓
StaffTable Component (staff-form-dialog.tsx)
    ↓
createUserWithClerk Action (Convex)
    ↓
CLERK API (POST /v1/users)
    ↓
CLERK WEBHOOK (user.created / user.updated)
    ↓
Convex HTTP Endpoint (/clerk-users-webhook)
    ↓
upsertFromClerk Mutation
    ↓
CONVEX DATABASE (users table)
```

### Key Pattern: Bidirectional Sync

| Direction | Origin | Destination | Trigger | Mechanism |
|:--|:--|:--|:--|:--|
| Clerk → Convex | Clerk (webhook) | Convex DB | user.created, user.updated, user.deleted | HTTP endpoint + Svix signature verification |
| Convex → Clerk | Convex (action) | Clerk API | createUserWithClerk, updateUserWithClerk | Direct API calls with CLERK_SECRET_KEY |

### User Schema in Dismissal

```typescript
users: defineTable({
  // Identification
  clerkId: v.string(),
  email: v.optional(v.string()),

  // Profile (synced from Clerk)
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  fullName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),

  // Role-based access control
  role: v.optional(
    v.union(
      v.literal("viewer"),
      v.literal("dispatcher"),
      v.literal("allocator"),
      v.literal("operator"),
      v.literal("admin"),
      v.literal("superadmin"),
    ),
  ),

  // Multi-tenancy (campus assignment)
  assignedCampuses: v.array(v.id("campusSettings")),

  // Additional info
  phone: v.optional(v.string()),
  avatarStorageId: v.optional(v.id("_storage")),

  // Status
  status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  isActive: v.boolean(),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"])
  .index("by_role", ["role"])
```

### Role Storage in Clerk publicMetadata

Dismissal stores roles in Clerk's `public_metadata`:

```json
{
  "role": "admin",
  "assignedCampuses": ["campus_123", "campus_456"],
  "status": "active"
}
```

**Benefits**:
- Available in JWT session claims
- Can be read in middleware without DB query
- Synced to Convex via webhook

### Webhook Implementation

**File**: `convex/http.ts`

```typescript
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    const payload = await request.text();
    const svixHeaders = {
      "svix-id": request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    };

    const wh = new Webhook(webhookSecret);
    let event: any;
    
    try {
      event = wh.verify(payload, svixHeaders);
    } catch (err) {
      return new Response("Invalid signature", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, { data: event.data });
        break;
      case "user.deleted":
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId: event.data.id });
        break;
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  })
});
```

### User Creation Action

**File**: `convex/users.ts`

```typescript
export const createUserWithClerk = action({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: roleValidator,
    assignedCampuses: v.array(v.id("campusSettings")),
  },
  handler: async (ctx, args) => {
    // 1. Verify admin permissions
    await checkAdminPermissions(ctx);

    // 2. Create user in Clerk
    const response = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [args.email],
        first_name: args.firstName,
        last_name: args.lastName,
        public_metadata: {
          role: args.role,
          assignedCampuses: args.assignedCampuses,
          status: "active",
        },
        skip_password_checks: true,
        skip_password_requirement: true,
      }),
    });

    // 3. Send invitation
    await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: args.email,
        redirect_url: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      }),
    });

    // Webhook will sync to Convex automatically
    return { success: true, message: "User created. Waiting for webhook sync..." };
  }
});
```

### Middleware Protection

**File**: `middleware.ts`

```typescript
export default clerkMiddleware(async (auth, req) => {
  const authObject = await auth();
  
  if (!authObject.userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Get role from session claims (from publicMetadata)
  const userRole = extractRoleFromMetadata(authObject.sessionClaims);

  // Check route permissions
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions.canAccessAll && !permissions.allowed.includes(pathname)) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
});
```

### Environment Variables Required

```env
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_JWT_ISSUER_DOMAIN=https://your-instance.clerk.accounts.dev
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## Part 2: Clerk Organizations Research

### How Clerk Organizations Work

Clerk Organizations enable grouping users with roles and permissions for multi-tenant B2B applications. Key concepts:

1. **Multiple Organizations per App**: A single Clerk application can contain multiple Organizations
2. **Users in Multiple Orgs**: Users can belong to multiple Organizations with separate roles in each
3. **Active Organization**: The organization a user is currently viewing determines their context and permissions

### User Pool Models

Clerk supports two multi-tenancy models:

1. **Shared User Pool** (Recommended for most cases):
   - Single pool of users across the application
   - User creates one account, can belong to multiple organizations
   - Each organization membership has its own role

2. **Isolated User Pools**:
   - Separate user pools per tenant
   - Requires multiple Clerk instances

### Organization Session Claims

When a user has an active organization, the JWT includes:

```typescript
{
  sessionId: 'sess_123',
  userId: 'user_123',
  orgId: 'org_456',           // Active organization ID
  orgRole: 'org:admin',       // User's role in active org
  orgSlug: 'acme-corp',       // URL-friendly org identifier
  orgPermissions: [           // User's permissions in active org
    'org:invoices:create',
    'org:invoices:read'
  ]
}
```

**Important**: When no organization is active, these fields are `null`.

### Built-in Organization Roles

Clerk provides default roles:
- `org:admin` - Full organization management
- `org:member` - Basic member access

### Custom Roles and Permissions

You can create up to **10 custom roles** per application instance.

**Permission Format**: `org:<feature>:<action>`

Examples:
- `org:invoices:create`
- `org:invoices:read`
- `org:billing:manage`

**Creating Custom Roles**:
1. Navigate to Roles & Permissions in Clerk Dashboard
2. Create role with key format `org:<role_name>`
3. Assign permissions to the role
4. Add role to a Role Set for member assignment

**Critical Note**: System Permissions are NOT included in session claims. For server-side permission checks, use Custom Permissions.

### Authorization Helpers

Clerk provides three authorization helpers:

1. **`has()`** - Check if user has specific role/permission
2. **`protect()`** - Protect server-side routes
3. **`<Protect>`** - React component for conditional rendering

```typescript
// Server-side check
const { has } = await auth();

if (!has({ permission: 'org:invoices:create' })) {
  throw new Error('Unauthorized');
}

// Or check role
if (!has({ role: 'org:admin' })) {
  throw new Error('Admin access required');
}
```

### Organization Webhook Events

Clerk fires these organization-related events:

| Event | Trigger |
|-------|---------|
| `organization.created` | New organization created |
| `organization.updated` | Organization info updated |
| `organization.deleted` | Organization deleted |
| `organizationMembership.created` | User added to organization |
| `organizationMembership.updated` | Membership role changed |
| `organizationMembership.deleted` | User removed from organization |
| `organizationInvitation.created` | Invitation sent |
| `organizationInvitation.accepted` | Invitation accepted |
| `organizationInvitation.revoked` | Invitation cancelled |

**Creating a new organization triggers BOTH `organization.created` AND `organizationMembership.created`** (for the creator).

### Webhook Payload Types

Import from `@clerk/nextjs/webhooks`:
- `OrganizationJSON` - Organization data
- `OrganizationMembershipJSON` - Membership data
- `OrganizationInvitationJSON` - Invitation data
- `UserJSON` - User data
- `DeletedObjectJSON` - Deletion events

### Member Enrollment Methods

1. **Invitations** - Manual invite with role assignment
2. **Verified Domains** - Auto-enroll users with matching email domains (e.g., @acme.com)
3. **Enterprise Connections** - SAML/OIDC for IT-managed deployments

### Pricing Considerations

- **MAO** = Monthly Active Organization (org with 2+ active users)
- Free: 50 MAOs (dev) / 100 MAOs (prod)
- Pro: $1 per additional MAO after first 100

---

## Part 3: Convex + Clerk Integration Patterns

### Approach 1: Client-Initiated Mutations

Store user on first authentication:

```typescript
// Schema
users: defineTable({
  name: v.string(),
  tokenIdentifier: v.string(),
}).index("by_token", ["tokenIdentifier"]),

// Mutation
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    if (existing) {
      if (existing.name !== identity.name) {
        await ctx.db.patch(existing._id, { name: identity.name });
      }
      return existing._id;
    }
    
    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});
```

### Approach 2: Webhook-Based Sync (Recommended)

More robust, handles all user lifecycle events:

```typescript
// Schema
users: defineTable({
  name: v.string(),
  externalId: v.string(), // Clerk user ID
}).index("byExternalId", ["externalId"]),

// Internal mutations
export const upsertFromClerk = internalMutation({
  args: { data: v.any() },
  async handler(ctx, { data }) {
    const userAttributes = {
      name: `${data.first_name} ${data.last_name}`,
      externalId: data.id,
    };
    
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", data.id))
      .unique();
      
    if (user === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});
```

### Webhook Endpoint Configuration

```
URL: https://<deployment-name>.convex.site/clerk-users-webhook
Note: Domain ends in .site, NOT .cloud
```

### Provider Setup Order

**Critical**: ClerkProvider must wrap ConvexClientProvider:

```tsx
<ClerkProvider>
  <ConvexClientProvider>
    {children}
  </ConvexClientProvider>
</ClerkProvider>
```

---

## Part 4: Implementation Comparison

### Option A: Dismissal Pattern (Custom Multi-tenancy)

Store tenant ID in user's publicMetadata and Convex record.

**Pros**:
- Full control over user/tenant relationship
- Simple schema design
- Works without Clerk Organizations feature
- Proven in production (Dismissal app)
- No MAO pricing concerns

**Cons**:
- Must implement tenant isolation manually
- publicMetadata storage limit (~1.2KB)
- No built-in organization UI/management
- No built-in organization invitations
- Must build own role management UI

**Best For**: Apps with simple tenant structures, single-tenant-per-user models

### Option B: Clerk Organizations (Native Multi-tenancy)

Use Clerk's built-in organization features.

**Pros**:
- Built-in tenant isolation via `orgId`
- Organization-level roles in JWT (`orgRole`)
- Clerk dashboard for org management
- Pre-built UI components (`<OrganizationSwitcher/>`, `<OrganizationProfile/>`)
- Organization invitations built-in
- Audit logs per organization
- Verified domains for auto-enrollment
- User can belong to multiple orgs

**Cons**:
- More complex webhook handling (org + membership events)
- Need to sync organization data to Convex
- MAO pricing applies
- More events to handle

**Best For**: B2B SaaS, team-based apps, apps where users need multiple org access

### Option C: Hybrid Approach (Recommended for CPM Payments)

Use Clerk Organizations for auth/isolation + Convex for extended data:

1. **Clerk handles**: Authentication, organization membership, basic roles
2. **Convex handles**: Extended user data, custom permissions, app-specific data
3. **Webhook syncs**: Users, organizations, and memberships to Convex

**Schema Design**:

```typescript
// Organizations (synced from Clerk)
organizations: defineTable({
  clerkOrgId: v.string(),
  name: v.string(),
  slug: v.string(),
  imageUrl: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_clerk_org_id", ["clerkOrgId"])
  .index("by_slug", ["slug"]),

// Users (synced from Clerk)
users: defineTable({
  clerkId: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"]),

// Organization Memberships (synced from Clerk)
organizationMembers: defineTable({
  clerkMembershipId: v.string(),
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  role: v.string(), // org:admin, org:member, custom roles
  createdAt: v.number(),
})
  .index("by_clerk_membership_id", ["clerkMembershipId"])
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_org_and_user", ["organizationId", "userId"]),
```

**Webhook Handler**:

```typescript
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateClerkWebhook(request);
    
    switch (event.type) {
      // User events
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, { data: event.data });
        break;
      case "user.deleted":
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId: event.data.id });
        break;
        
      // Organization events
      case "organization.created":
      case "organization.updated":
        await ctx.runMutation(internal.organizations.upsertFromClerk, { data: event.data });
        break;
      case "organization.deleted":
        await ctx.runMutation(internal.organizations.deleteFromClerk, { clerkOrgId: event.data.id });
        break;
        
      // Membership events
      case "organizationMembership.created":
      case "organizationMembership.updated":
        await ctx.runMutation(internal.members.upsertFromClerk, { data: event.data });
        break;
      case "organizationMembership.deleted":
        await ctx.runMutation(internal.members.deleteFromClerk, { data: event.data });
        break;
    }
    
    return new Response(null, { status: 200 });
  }),
});
```

---

## Part 5: Recommendation for CPM Payments

### Recommended Approach: Option C (Hybrid)

Given that CPM Payments:
- Has multiple tenants (sports organizations)
- Needs role-based access control
- May have users accessing multiple organizations
- Requires staff management per organization

**Use Clerk Organizations** because:
1. Built-in tenant isolation via `orgId` in every request
2. Pre-built UI for organization switching
3. Invitation system for new members
4. Role management per organization
5. Clean separation: user exists once, memberships per org

### Key Differences from Dismissal

| Aspect | Dismissal | CPM Payments (Recommended) |
|--------|-----------|---------------------------|
| Multi-tenancy | `assignedCampuses` array | Clerk Organizations |
| Roles | Custom in publicMetadata | Org roles (`org:admin`, etc.) |
| Tenant switching | Manual implementation | `<OrganizationSwitcher/>` |
| Invitations | Custom via Clerk API | Built-in org invitations |
| User isolation | Query by campus ID | Query by `orgId` from auth |

### Implementation Checklist

1. **Enable Organizations** in Clerk Dashboard
2. **Configure webhook events**:
   - user.created, user.updated, user.deleted
   - organization.created, organization.updated, organization.deleted
   - organizationMembership.created, organizationMembership.updated, organizationMembership.deleted

3. **Create Convex tables**:
   - users
   - organizations
   - organizationMembers

4. **Implement webhook handler** in `convex/http.ts`

5. **Update middleware** to use `orgId` and `orgRole` from auth

6. **Update queries/mutations** to filter by organization

7. **Add organization UI components**:
   - `<OrganizationSwitcher/>`
   - `<CreateOrganization/>`
   - `<OrganizationProfile/>`

### Route Protection Strategy

```typescript
// middleware.ts
export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId, orgRole } = await auth();
  
  // Public routes
  if (isPublicRoute(req.url)) return;
  
  // Must be authenticated
  if (!userId) {
    return redirectToSignIn(req);
  }
  
  // For tenant routes, must have active organization
  if (isTenantRoute(req.url) && !orgId) {
    return redirectToOrgSelector(req);
  }
  
  // Check role-based access
  if (!hasRouteAccess(req.url, orgRole)) {
    return redirectToUnauthorized(req);
  }
});
```

### Convex Query Pattern

```typescript
// Always filter by organization
export const getTeams = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Get org from identity claims
    const orgId = identity.org_id; // or however org is exposed
    
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", orgId))
      .unique();
    
    if (!org) throw new Error("Organization not found");
    
    return ctx.db
      .query("teams")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();
  },
});
```

---

## Environment Variables Required

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_JWT_ISSUER_DOMAIN=https://your-instance.clerk.accounts.dev

# Convex
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
```

---

## Next Steps

1. Review this document together
2. Decide on exact schema for CPM Payments
3. Implement webhook handler
4. Set up Clerk Organizations in dashboard
5. Update middleware/proxy for route protection
6. Create organization management UI
