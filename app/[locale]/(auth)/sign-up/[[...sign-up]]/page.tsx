import { SignUp } from "@clerk/nextjs";
import { ROUTES } from "@/lib/navigation/routes";
import { routing } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SignUpPage({ params }: PageProps) {
  const { locale } = await params;
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;

  return (
    <SignUp
      signInUrl={`${localePrefix}${ROUTES.auth.signIn}`}
      forceRedirectUrl={`${localePrefix}${ROUTES.auth.organizations}`}
    />
  );
}
