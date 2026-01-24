// ################################################################################
// # Check: 12/14/2025                                                            #
// ################################################################################

// CONVEX AND CLERK PROVIDERS
import ConvexClientProvider from "@/components/providers/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";

// STYLES RELATED
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ColorSchemeProvider } from "@/components/providers/color-scheme-provider";
import { ThemeScript } from "@/components/providers/theme-script";
import { fontVariables } from "@/lib/fonts";
import { shadcn } from "@clerk/themes";
import "@/app/globals.css";

// NEXT-INTL RELATED
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { esES, enUS } from "@clerk/localizations";
import { notFound } from "next/navigation";

const clerkLocalizations = {
  es: esES,
  en: enUS,
} as const;

// METADATA
// TODO: generateMetadata depending on locale (https://github.com/amannn/next-intl/blob/main/examples/example-app-router/src/app/%5Blocale%5D/layout.tsx)
import { rootMetadata } from "@/lib/seo/root";
import type { Metadata } from "next";
export const metadata: Metadata = rootMetadata;

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const clerkLocalization =
    clerkLocalizations[locale as keyof typeof clerkLocalizations] ?? enUS;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${fontVariables} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ColorSchemeProvider>
            <ClerkProvider
              dynamic
              localization={clerkLocalization}
              appearance={{
                theme: shadcn,
              }}
            >
              <ConvexClientProvider>
                <NextIntlClientProvider>{children}</NextIntlClientProvider>
              </ConvexClientProvider>
            </ClerkProvider>
          </ColorSchemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
