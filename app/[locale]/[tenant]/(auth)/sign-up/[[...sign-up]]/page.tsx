import { SignUp } from "@clerk/nextjs";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function TenantSignUpPage({ params }: PageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();

  // Get organization data for logo
  const preloadedOrganization = await preloadQuery(
    api.organizations.getBySlug,
    { slug: tenant },
    { token },
  );
  const organization = preloadedQueryResult(preloadedOrganization);

  return (
    <SignUp
      signInUrl={`/${tenant}/sign-in`}
      forceRedirectUrl={`/${tenant}/applications`}
      unsafeMetadata={{ pendingOrganizationSlug: tenant }}
      appearance={{
        elements: {
          rootBox: {
            width: "100%",
          },
          card: organization?.imageUrl
            ? {
                "&::before": {
                  content: '""',
                  display: "block",
                  width: "100px",
                  height: "100px",
                  backgroundImage: `url(${organization.imageUrl})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  margin: "0 auto 1.5rem",
                  borderRadius: "0.5rem",
                },
              }
            : {},
          header: {
            display: "block",
          },
          headerTitle: {
            marginTop: "0.5rem",
          },
          headerSubtitle: {
            color: "hsl(var(--muted-foreground))",
          },

        },
      }}
    />
  );
}

