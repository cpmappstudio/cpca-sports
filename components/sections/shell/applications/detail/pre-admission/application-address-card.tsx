"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Home } from "lucide-react";
import type { Application } from "@/lib/applications/types";

interface ApplicationAddressCardProps {
  application: Application;
}

export function ApplicationAddressCard({
  application,
}: ApplicationAddressCardProps) {
  const t = useTranslations("Applications.detail");

  const fullAddress = [
    application.streetAddress,
    application.city,
    application.state,
    application.zipCode,
    application.country,
  ]
    .filter(Boolean)
    .join(", ");

  const rows = [
    {
      label: t("country"),
      value: application.country,
    },
    {
      label: t("state"),
      value: application.state,
    },
    {
      label: t("city"),
      value: application.city,
    },
    {
      label: t("streetAddress"),
      value: application.streetAddress,
    },
    {
      label: t("zipCode"),
      value: application.zipCode,
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-6">
        <h3 className="text-base font-bold text-foreground">{t("addressInfo")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {rows.map((row, index) => (
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
      </CardContent>
    </Card>
  );
}
