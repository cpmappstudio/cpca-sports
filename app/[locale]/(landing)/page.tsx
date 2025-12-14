// ################################################################################
// # Check: 12/13/2025                                                            #
// ################################################################################

import { CallToAction } from "@/components/sections/landing/CallToAction";
import { Faqs } from "@/components/sections/landing/Faqs";
import { Footer } from "@/components/sections/landing/Footer";
import { Hero } from "@/components/sections/landing/Hero";
import { Pricing } from "@/components/sections/landing/Pricing";
import { PrimaryFeatures } from "@/components/sections/landing/PrimaryFeatures";
import { SecondaryFeatures } from "@/components/sections/landing/SecondaryFeatures";
import { Testimonials } from "@/components/sections/landing/Testimonials";
import { landingMetadata } from "@/lib/seo/landing";
import { Metadata } from "next";

export const metadata: Metadata = landingMetadata;

export default function Home() {
  return (
    <>
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
