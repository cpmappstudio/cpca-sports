import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ROUTES } from "@/lib/navigation/routes";

interface OrgSignInPageProps {
  params: Promise<{
    locale: string;
    tenant: string;
  }>;
}

export default async function OrgSignInPage({ params }: OrgSignInPageProps) {
  const { tenant, locale } = await params;

  // Verify organization exists
  const league = await fetchQuery(api.leagues.getBySlug, { slug: tenant });

  if (!league) {
    redirect(`/${locale}${ROUTES.auth.signIn}`);
  }

  // Build the redirect URL for after sign-in
  // This will be handled by the auth callback to redirect based on role
  const afterSignInUrl = `/${locale}${ROUTES.auth.orgAuthCallback(tenant)}`;

  return (
    <SignIn
      forceRedirectUrl={afterSignInUrl}
      appearance={{
        elements: {
          headerTitle: {
            display: "none",
          },
          headerSubtitle: {
            display: "none",
          },
        },
      }}
    />
  );
}
