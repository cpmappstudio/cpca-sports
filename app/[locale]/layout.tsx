// ################################################################################
// # Check: 12/13/2025                                                            #
// ################################################################################
// There is some minor inconsistency related to html syntax; headers inside body, etc.

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ColorSchemeProvider } from "@/components/providers/color-scheme-provider";
import ConvexClientProvider from "@/components/providers/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { hasLocale, NextIntlClientProvider } from "next-intl";

import { fontVariables } from "@/lib/fonts";
import { shadcn } from "@clerk/themes";
import "@/app/globals.css";

import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

import { esES, enUS } from "@clerk/localizations";
import { rootMetadata } from "@/lib/seo/root";
import type { Metadata } from "next";
export const metadata: Metadata = rootMetadata;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const clerkLocalizations = {
  es: esES,
  en: enUS,
} as const;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const clerkLocalization =
    clerkLocalizations[locale as keyof typeof clerkLocalizations] ?? esES;

  return (
    <html lang={locale} suppressHydrationWarning>
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
                <NextIntlClientProvider locale={locale} messages={messages}>
                  {children}
                </NextIntlClientProvider>
              </ConvexClientProvider>
            </ClerkProvider>
          </ColorSchemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
