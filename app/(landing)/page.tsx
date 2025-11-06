import { CallToAction } from "@/components/landing/CallToAction";
import { Faqs } from "@/components/landing/Faqs";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Pricing } from "@/components/landing/Pricing";
import { PrimaryFeatures } from "@/components/landing/PrimaryFeatures";
import { SecondaryFeatures } from "@/components/landing/SecondaryFeatures";
import { Testimonials } from "@/components/landing/Testimonials";
import type { Metadata } from "next";
import clsx from "clsx";

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
      <Header />
      <main>
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
