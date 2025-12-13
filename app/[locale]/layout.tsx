import type { Metadata } from "next";
import {
    Inter,
    Geist_Mono,
    Montserrat,
    Merriweather,
    Source_Code_Pro,
    Plus_Jakarta_Sans,
    Source_Serif_4,
    JetBrains_Mono,
    DM_Sans,
    Space_Mono,
    Oxanium,
    Open_Sans,
} from "next/font/google";
import "../globals.css";

import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import ConvexClientProvider from "@/components/providers/convex-client-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ColorSchemeProvider } from "@/components/providers/color-scheme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import { esES, enUS } from "@clerk/localizations";
import { rootMetadata } from "@/lib/seo/root";

export const metadata: Metadata = rootMetadata;

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const montserrat = Montserrat({
    subsets: ["latin"],
    variable: "--font-montserrat",
});

const merriweather = Merriweather({
    subsets: ["latin"],
    weight: ["300", "400", "700", "900"],
    variable: "--font-merriweather",
});

const sourceCodePro = Source_Code_Pro({
    subsets: ["latin"],
    variable: "--font-source-code-pro",
});

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-plus-jakarta-sans",
});

const sourceSerif4 = Source_Serif_4({
    subsets: ["latin"],
    variable: "--font-source-serif-4",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
});

const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-dm-sans",
});

const spaceMono = Space_Mono({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-space-mono",
});

const oxanium = Oxanium({
    subsets: ["latin"],
    variable: "--font-oxanium",
});

const openSans = Open_Sans({
    subsets: ["latin"],
    variable: "--font-open-sans",
});

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
    const clerkLocalization = clerkLocalizations[locale as keyof typeof clerkLocalizations] ?? esES;

    return (
        <html lang={locale} suppressHydrationWarning>
            <body className={`${inter.variable} ${geistMono.variable} ${montserrat.variable} ${merriweather.variable} ${sourceCodePro.variable} ${plusJakartaSans.variable} ${sourceSerif4.variable} ${jetbrainsMono.variable} ${dmSans.variable} ${spaceMono.variable} ${oxanium.variable} ${openSans.variable} antialiased`}>
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
