"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { School, MapPin, Award, User } from "lucide-react";
import type { Application } from "@/lib/applications/types";

interface ApplicationSchoolCardProps {
  application: Application;
}

export function ApplicationSchoolCard({
  application,
}: ApplicationSchoolCardProps) {
  const t = useTranslations("Applications.detail");

  const schoolAddress = [
    application.schoolAddress,
    application.schoolCity,
    application.schoolState,
    application.schoolZipCode,
    application.schoolCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const rows = [
    {
      label: t("currentSchool"),
      value: application.currentSchoolName,
    },
    {
      label: t("schoolAddress"),
      value: schoolAddress || "-",
    },
    {
      label: t("schoolType"),
      value: application.currentSchoolType,
    },
    {
      label: t("gpa"),
      value: application.currentGPA,
    },
  ];

  const referenceRows = [
    {
      label: t("referenceName"),
      value: application.referenceFullName,
    },
    {
      label: t("referenceRelationship"),
      value: application.referenceRelationship,
    },
    {
      label: t("referencePhone"),
      value: application.referencePhone,
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-6">
        <h3 className="text-base font-bold text-foreground">{t("schoolInfo")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map((row, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {row.label}
                </p>
              </div>
              <p className="text-sm wrap-break-word">{row.value}</p>
            </div>
          ))}
        </div>

        <div>
          <h4 className="text-base font-bold text-foreground mb-3">{t("reference")}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {referenceRows.map((row, index) => (
              <div key={index} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {row.label}
                  </p>
                </div>
                <p className="text-sm">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
