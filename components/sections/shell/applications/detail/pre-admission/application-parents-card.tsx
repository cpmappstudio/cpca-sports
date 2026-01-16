"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Users } from "lucide-react";
import type { Application } from "@/lib/applications/types";

interface ApplicationParentsCardProps {
  application: Application;
}

export function ApplicationParentsCard({
  application,
}: ApplicationParentsCardProps) {
  const t = useTranslations("Applications.detail");

  const parent1Rows = [
    {
      icon: <User className="h-4 w-4 text-primary" />,
      label: t("fullName"),
      value: `${application.parent1FirstName} ${application.parent1LastName}`,
    },
    {
      icon: <Users className="h-4 w-4 text-primary" />,
      label: t("relationship"),
      value: application.parent1Relationship,
    },
    {
      icon: <Mail className="h-4 w-4 text-primary" />,
      label: t("email"),
      value: application.parent1Email,
    },
    {
      icon: <Phone className="h-4 w-4 text-primary" />,
      label: t("phone"),
      value: application.parent1Telephone,
    },
  ];

  const parent2Rows = application.parent2FirstName
    ? [
        {
          label: t("fullName"),
          value: `${application.parent2FirstName} ${application.parent2LastName}`,
        },
        {
          label: t("relationship"),
          value: application.parent2Relationship || "-",
        },
        {
          label: t("email"),
          value: application.parent2Email || "-",
        },
        {
          label: t("phone"),
          value: application.parent2Telephone || "-",
        },
      ]
    : null;

  return (
    <Card>
      <CardContent className="space-y-6">
        <h3 className="text-base font-bold text-foreground">{t("parentsInfo")}</h3>
        <div>
          <h4 className="text-base font-bold text-foreground mb-3">{t("parent1")}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {parent1Rows.map((row, index) => (
              <div key={index} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {row.label}
                  </p>
                </div>
                <p className="text-sm break-words">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        {parent2Rows && (
          <div>
            <h4 className="text-base font-bold text-foreground mb-3">{t("parent2")}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {parent2Rows.map((row, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {row.label}
                    </p>
                  </div>
                  <p className="text-sm break-words">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
