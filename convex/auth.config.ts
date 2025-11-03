import { AuthConfig } from "convex/server";

const clerkIssuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!clerkIssuer) {
  throw new Error("CLERK_JWT_ISSUER_DOMAIN is not set");
}

export default {
  providers: [
    {
      // Replace with your own Clerk Issuer URL from your "convex" JWT template
      // or with `process.env.CLERK_JWT_ISSUER_DOMAIN`
      // and configure CLERK_JWT_ISSUER_DOMAIN on the Convex Dashboard
      // See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
      domain: clerkIssuer,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
