import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ROUTES } from "@/lib/navigation/routes";

interface OrgSignUpPageProps {
  params: Promise<{
    locale: string;
    tenant: string;
  }>;
}

export default async function OrgSignUpPage({ params }: OrgSignUpPageProps) {
  const { tenant, locale } = await params;

  // Verify organization exists
  const league = await fetchQuery(api.leagues.getBySlug, { slug: tenant });

  if (!league) {
    redirect(`/${locale}${ROUTES.auth.signUp}`);
  }

  // After sign-up, redirect to auth-callback for role-based routing
  const afterSignUpUrl = `/${locale}${ROUTES.auth.orgAuthCallback(tenant)}`;

  return (
    <SignUp
      forceRedirectUrl={afterSignUpUrl}
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
