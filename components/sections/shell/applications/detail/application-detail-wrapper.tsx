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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserIcon } from "@heroicons/react/20/solid";
import { CreditCard, File, History } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEFAULT_APPLICATION_FEES } from "@/lib/applications/fee-types";
import type {
  FeePayment,
  PaymentStatus,
  PaymentTransaction,
} from "@/lib/applications/payment-types";
import { ApplicationTransactionHistory } from "./application-transaction-history";

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

  const [fees, setFees] = useState<FeePayment[]>(
    DEFAULT_APPLICATION_FEES.map((fee) => ({
      ...fee,
      status: "pending" as PaymentStatus,
      paidAmount: 0,
      createdAt: Date.now(),
    })),
  );

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  const handleAddFee = (fee: FeePayment) => {
    setFees([...fees, fee]);
  };

  const handleRemoveFee = (feeId: string) => {
    setFees(fees.filter((fee) => fee.id !== feeId));
  };

  const handleUpdateFee = (feeId: string, updates: Partial<FeePayment>) => {
    setFees(
      fees.map((fee) => (fee.id === feeId ? { ...fee, ...updates } : fee)),
    );
  };

  const handleMarkAsPaid = (feeId: string) => {
    const fee = fees.find((f) => f.id === feeId);
    if (!fee) return;

    const amountToPay = fee.totalAmount - fee.paidAmount;

    const transaction: PaymentTransaction = {
      id: `txn_${Date.now()}`,
      date: Date.now(),
      amount: amountToPay,
      feeId: fee.id,
      feeName: fee.name,
      method: "cash",
      status: "completed",
      reference: `CASH-${Date.now()}`,
    };

    setTransactions([transaction, ...transactions]);

    handleUpdateFee(feeId, {
      status: "paid",
      paidAmount: fee.totalAmount,
      paidAt: Date.now(),
    });
  };

  const totalDue = fees.reduce((sum, fee) => sum + fee.totalAmount, 0);
  const totalPaid = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
  const totalPending = totalDue - totalPaid;

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
            totalDue={totalDue}
            totalPaid={totalPaid}
            totalPending={totalPending}
          />
        </div>
      </div>

      <div className="lg:col-span-3">
        <Tabs defaultValue="application" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="mb-4 h-9 inline-flex w-auto">
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
              <TabsTrigger
                value="transactions"
                className="gap-1 text-xs md:text-sm px-2 md:px-3"
              >
                <History className="hidden md:block h-4 w-4" />
                <span>{t("tabs.transactions")}</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
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
                fees={fees}
                onAddFee={handleAddFee}
                onRemoveFee={handleRemoveFee}
                onUpdateFee={handleUpdateFee}
                onMarkAsPaid={handleMarkAsPaid}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="transactions" className="mt-0">
            <ApplicationTransactionHistory
              transactions={transactions}
              fees={fees}
            />
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
