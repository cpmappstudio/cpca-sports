"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Globe } from "lucide-react";
import type { Application } from "@/lib/applications/types";

interface ApplicationAdditionalCardProps {
  application: Application;
}

export function ApplicationAdditionalCard({
  application,
}: ApplicationAdditionalCardProps) {
  const t = useTranslations("Applications.detail");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const rows = [
    {
      label: t("submittedBy"),
      value: application.personSubmitting,
    },
    {
      label: t("howDidYouHear"),
      value: application.howDidYouHear,
    },
    {
      label: t("needsI20"),
      value: application.needsI20 === "yes" ? t("yes") : t("no"),
    },
    {
      label: t("submittedAt"),
      value: formatDate(application.createdAt),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("additionalInfo")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {rows.map((row, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {row.label}
                </p>
              </div>
              <p className="text-sm capitalize">{row.value}</p>
            </div>
          ))}
        </div>

        {application.message && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              {t("message")}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {application.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
