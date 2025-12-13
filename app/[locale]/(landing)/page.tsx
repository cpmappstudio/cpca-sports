import { CallToAction } from "@/components/sections/landing/CallToAction";
import { Faqs } from "@/components/sections/landing/Faqs";
import { Footer } from "@/components/sections/landing/Footer";
import {
  NavbarLandingNavbar,
  SidebarLandingNavbar,
} from "@/components/sections/landing/landing-navbar";
import { Hero } from "@/components/sections/landing/Hero";
import { Pricing } from "@/components/sections/landing/Pricing";
import { PrimaryFeatures } from "@/components/sections/landing/PrimaryFeatures";
import { SecondaryFeatures } from "@/components/sections/landing/SecondaryFeatures";
import { Testimonials } from "@/components/sections/landing/Testimonials";
import type { Metadata } from "next";
import clsx from "clsx";
import { StackedLayout } from "@/components/layouts/stacked-layout";

export const metadata: Metadata = {
  title: {
    template: "%s - TaxPal",
    default: "TaxPal - Accounting made simple for small businesses",
  },
  description:
    "Most bookkeeping software is accurate, but hard to use. We make the opposite trade-off, and hope you don’t get audited.",
};

export default function Home() {
  return (
    <>
      {/*<Header /> */}
      <main className="bg-white antialiased">
        <Hero />
        <PrimaryFeatures />
        <SecondaryFeatures />
        <CallToAction />
        <Testimonials />
        <Pricing />
        <Faqs />
      </main>
      <Footer />
    </>
  );
}
