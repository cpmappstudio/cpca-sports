import { notFound } from "next/navigation";
import { ApplicationHeader } from "@/components/sections/shell/applications/detail/application-header";
import { ApplicationOverviewCard } from "@/components/sections/shell/applications/detail/application-overview-card";
import { ApplicationSchoolCard } from "@/components/sections/shell/applications/detail/application-school-card";
import { ApplicationParentsCard } from "@/components/sections/shell/applications/detail/application-parents-card";
import { ApplicationAddressCard } from "@/components/sections/shell/applications/detail/application-address-card";
import { ApplicationAdditionalCard } from "@/components/sections/shell/applications/detail/application-additional-card";
import { MOCK_APPLICATIONS, IS_ADMIN } from "@/lib/applications/mocks";
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
import { CreditCard, File, Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ tenant: string; applicationId: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { tenant, applicationId } = await params;
  const t = await getTranslations("Applications");

  const application = MOCK_APPLICATIONS.find(
    (app) => app._id === applicationId,
  );

  if (!application) {
    notFound();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 py-6">
      <div className="lg:col-span-2">
        <ApplicationHeader
          application={application}
          organizationSlug={tenant}
          isAdmin={IS_ADMIN}
        />
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
              value="payments"
              className="gap-1 text-xs md:text-sm px-2 md:px-3"
            >
              <CreditCard className="hidden md:block h-4 w-4" />
              <span>{t("tabs.payments")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="docs"
              className="gap-1 text-xs md:text-sm px-2 md:px-3"
            >
              <File className="hidden md:block h-4 w-4" />
              <span>{t("tabs.documents")}</span>
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
            <Suspense
              fallback={<Skeleton className="h-96 w-full" />}
            ></Suspense>
          </TabsContent>
          <TabsContent value="payments" className="mt-0">
            <Suspense
              fallback={<Skeleton className="h-96 w-full" />}
            ></Suspense>
          </TabsContent>
        </Tabs>
      </div>

      {/* <div className="grid gap-6 mt-8 md:grid-cols-2">
        <Tabs defaultValue="curriculums" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="athlete" className="gap-2">
              Athlete
            </TabsTrigger>
            <TabsTrigger value="address" className="gap-2">
              Address
            </TabsTrigger>
            <TabsTrigger value="school" className="gap-2">
              School
            </TabsTrigger>
            <TabsTrigger value="parents" className="gap-2">
              Parents
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              General
            </TabsTrigger>
          </TabsList>
          <TabsContent value="athlete" className="mt-0">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ApplicationOverviewCard application={application} />
              <ApplicationProgramCard application={application} />
            </Suspense>
          </TabsContent>
          <TabsContent value="address" className="mt-0">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ApplicationAddressCard application={application} />
            </Suspense>
          </TabsContent>
          <TabsContent value="school" className="mt-0">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ApplicationSchoolCard application={application} />
            </Suspense>
          </TabsContent>
          <TabsContent value="parents" className="mt-0">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ApplicationParentsCard application={application} />
            </Suspense>
          </TabsContent>
          <TabsContent value="general" className="mt-0">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ApplicationAdditionalCard application={application} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div> */}
    </div>
  );
}
