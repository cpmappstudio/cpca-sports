"use client";

import type { ReactNode } from "react";
import { File, CreditCard, Dumbbell } from "lucide-react";
import { UserIcon } from "@heroicons/react/20/solid";
import CpcaHeader from "@/components/common/cpca-header";
import { TabsNavigation } from "@/components/common/tabs-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";

export type FormDefaultsEditorTab =
  "application" | "documents" | "payments" | "coaches";

interface FormDefaultsEditorShellProps {
  media?: ReactNode;
  logoUrl?: string;
  title: ReactNode;
  subtitle: ReactNode;
  action?: ReactNode;
  activeTab: FormDefaultsEditorTab;
  tabLabels: {
    application: string;
    documents: string;
    payments: string;
    coaches?: string;
  };
  onTabChange: (tab: FormDefaultsEditorTab) => void;
  applicationContent: ReactNode;
  documentsContent: ReactNode;
  paymentsContent: ReactNode;
  coachesContent?: ReactNode;
}

export function FormDefaultsEditorShell({
  media,
  logoUrl,
  title,
  subtitle,
  action,
  activeTab,
  tabLabels,
  onTabChange,
  applicationContent,
  documentsContent,
  paymentsContent,
  coachesContent,
}: FormDefaultsEditorShellProps) {
  return (
    <>
      <CpcaHeader
        media={media}
        logoUrl={logoUrl}
        title={title}
        subtitle={subtitle}
        action={action}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as FormDefaultsEditorTab)}
        className="w-full gap-0"
      >
        <TabsNavigation
          items={[
            {
              value: "application",
              label: tabLabels.application,
              icon: UserIcon,
            },
            ...(tabLabels.coaches && coachesContent
              ? [
                  {
                    value: "coaches",
                    label: tabLabels.coaches,
                    icon: Dumbbell,
                  },
                ]
              : []),
            {
              value: "documents",
              label: tabLabels.documents,
              icon: File,
            },
            {
              value: "payments",
              label: tabLabels.payments,
              icon: CreditCard,
            },
          ]}
        />

        <TabsContent value="application" className="relative z-0 mt-0">
          <Card className="relative z-0">
            <CardContent className="space-y-6 px-0 pt-0 sm:px-6">
              {applicationContent}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="relative z-0 mt-0">
          <Card className="relative z-0">
            <CardContent className="pt-0">{documentsContent}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="relative z-0 mt-0">
          <Card className="relative z-0">
            <CardContent className="pt-0">{paymentsContent}</CardContent>
          </Card>
        </TabsContent>
        {tabLabels.coaches && coachesContent ? (
          <TabsContent value="coaches" className="relative z-0 mt-0">
            <Card className="relative z-0">
              <CardContent className="pt-0">{coachesContent}</CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}
