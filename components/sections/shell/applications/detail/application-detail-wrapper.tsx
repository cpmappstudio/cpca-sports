"use client";

import { Authenticated, Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ApplicationHeader } from "./application-header";
import { ApplicationOverviewCard } from "./pre-admission/application-overview-card";
import { ApplicationSchoolCard } from "./pre-admission/application-school-card";
import { ApplicationParentsCard } from "./pre-admission/application-parents-card";
import { ApplicationAddressCard } from "./pre-admission/application-address-card";
import { ApplicationAdditionalCard } from "./pre-admission/application-additional-card";
import { ApplicationDocuments } from "./application-documents";
import { ApplicationPayments } from "./application-payments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserIcon } from "@heroicons/react/20/solid";
import { CreditCard, File } from "lucide-react";
import { useTranslations } from "next-intl";

interface ApplicationDetailWrapperProps {
  preloadedApplication: Preloaded<typeof api.applications.getById>;
  organizationSlug: string;
  applicationId: string;
  isAdmin: boolean;
}

function ApplicationDetailContent({
  preloadedApplication,
  organizationSlug,
  applicationId,
  isAdmin,
}: ApplicationDetailWrapperProps) {
  const application = usePreloadedQuery(preloadedApplication);
  const t = useTranslations("Applications");

  if (application === null) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 ">
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-6">
          <ApplicationHeader
            application={application}
            organizationSlug={organizationSlug}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      <div className="lg:col-span-3">
        <Tabs defaultValue="application" className="w-full">
          <TabsList className="mb-4 h-9">
            <TabsTrigger
              value="application"
              className="gap-1 text-xs md:text-sm px-2 md:px-3"
            >
              <UserIcon className="hidden md:block h-4 w-4" />
              <span>{t("tabs.application")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="docs"
              className="gap-1 text-xs md:text-sm px-2 md:px-3"
            >
              <File className="hidden md:block h-4 w-4" />
              <span>{t("tabs.documents")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="gap-1 text-xs md:text-sm px-2 md:px-3"
            >
              <CreditCard className="hidden md:block h-4 w-4" />
              <span>{t("tabs.payments")}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="application" className="mt-0">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="athlete">
                <AccordionTrigger>{t("sections.athlete")}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-balance">
                  <ApplicationOverviewCard application={application} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="address">
                <AccordionTrigger>{t("sections.address")}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-balance">
                  <ApplicationAddressCard application={application} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="school">
                <AccordionTrigger>{t("sections.school")}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-balance">
                  <ApplicationSchoolCard application={application} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="parents">
                <AccordionTrigger>{t("sections.parents")}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-balance">
                  <ApplicationParentsCard application={application} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="general">
                <AccordionTrigger>{t("sections.general")}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-balance">
                  <ApplicationAdditionalCard application={application} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          <TabsContent value="docs" className="mt-0">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ApplicationDocuments
                applicationId={applicationId}
                isAdmin={isAdmin}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="payments" className="mt-0">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ApplicationPayments
                applicationId={applicationId}
                isAdmin={isAdmin}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export function ApplicationDetailWrapper(props: ApplicationDetailWrapperProps) {
  return (
    <Authenticated>
      <ApplicationDetailContent {...props} />
    </Authenticated>
  );
}
