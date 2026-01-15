"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, Phone, Calendar, Globe, Ruler, Video, BookOpen, GraduationCap, Home } from "lucide-react";
import type { Application } from "@/lib/applications/types";

interface ApplicationOverviewCardProps {
  application: Application;
}

export function ApplicationOverviewCard({
  application,
}: ApplicationOverviewCardProps) {
  const t = useTranslations("Applications.detail");
  const tPrograms = useTranslations("Applications.programs");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const athleteRows = [
    {
      label: t("fullName"),
      value: `${application.firstName} ${application.lastName}`,
    },
    {
      label: t("email"),
      value: application.email,
    },
    {
      label: t("phone"),
      value: application.telephone,
    },
    {
      label: t("birthDate"),
      value: formatDate(application.birthDate),
    },
    {
      label: t("sex"),
      value: application.sex === "male" ? t("male") : t("female"),
    },
    {
      label: t("height"),
      value: application.height,
    },
    {
      label: t("birthCountry"),
      value: application.countryOfBirth,
    },
    {
      label: t("citizenship"),
      value: application.countryOfCitizenship,
    },
  ];

  const programRows = [
    {
      label: t("program"),
      value: tPrograms(application.program),
    },
    {
      label: t("format"),
      value: application.format === "full-time" ? t("fullTime") : t("partTime"),
    },
    {
      label: t("gradeEntering"),
      value: application.gradeEntering,
    },
    {
      label: t("enrollmentYear"),
      value: application.enrollmentYear,
    },
    {
      label: t("graduationYear"),
      value: application.graduationYear,
    },
    {
      label: t("programOfInterest"),
      value: application.programOfInterest,
    },
    {
      label: t("boarding"),
      value: application.interestedInBoarding === "yes" ? t("yes") : t("no"),
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-base font-bold text-foreground mb-3">{t("athleteInfo")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {athleteRows.map((row, index) => (
              <div key={index} className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {row.label}
                </p>
                <p className="text-sm break-words">{row.value}</p>
              </div>
            ))}
            {application.highlightsLink && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {t("highlights")}
                </p>
                <a
                  href={application.highlightsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {application.highlightsLink}
                </a>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-foreground mb-3">{t("programInfo")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {programRows.map((row, index) => (
              <div key={index} className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {row.label}
                </p>
                <p className="text-sm capitalize">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
