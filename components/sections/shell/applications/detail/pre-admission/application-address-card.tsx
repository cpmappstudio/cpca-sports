"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CountryCombobox } from "@/components/ui/country-combobox";
import type { Application } from "@/lib/applications/types";
import { getFormField } from "@/lib/applications/types";

interface ApplicationAddressCardProps {
  application: Application;
  isEditing: boolean;
  onDataChange?: (data: Record<string, string | number | boolean | null>) => void;
}

interface EditableFormData {
  country: string;
  state: string;
  city: string;
  streetAddress: string;
  zipCode: string;
}

export function ApplicationAddressCard({
  application,
  isEditing,
  onDataChange,
}: ApplicationAddressCardProps) {
  const t = useTranslations("Applications.detail");
  const tAddress = useTranslations("preadmission.address");

  const { formData } = application;

  const country = getFormField(formData, "address", "country");
  const state = getFormField(formData, "address", "state");
  const city = getFormField(formData, "address", "city");
  const streetAddress = getFormField(formData, "address", "streetAddress");
  const zipCode = getFormField(formData, "address", "zipCode");

  const [editData, setEditData] = useState<EditableFormData>({
    country,
    state,
    city,
    streetAddress,
    zipCode,
  });

  useEffect(() => {
    if (!isEditing) {
      setEditData({
        country,
        state,
        city,
        streetAddress,
        zipCode,
      });
    }
  }, [isEditing, country, state, city, streetAddress, zipCode]);

  const handleFieldChange = (field: keyof EditableFormData, value: string) => {
    const newData = { ...editData, [field]: value };
    setEditData(newData);
    onDataChange?.(newData);
  };

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="mb-3">
          <h3 className="text-base font-bold text-foreground">
            {t("addressInfo")}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("country")}
            </p>
            {isEditing ? (
              <CountryCombobox
                value={editData.country}
                onValueChange={(value) => handleFieldChange("country", value)}
                placeholder={tAddress("countryPlaceholder")}
              />
            ) : (
              <p className="text-sm">{country || "-"}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("state")}
            </p>
            {isEditing ? (
              <Input
                value={editData.state}
                onChange={(e) => handleFieldChange("state", e.target.value)}
                placeholder={tAddress("statePlaceholder")}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm">{state || "-"}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">{t("city")}</p>
            {isEditing ? (
              <Input
                value={editData.city}
                onChange={(e) => handleFieldChange("city", e.target.value)}
                placeholder={tAddress("cityPlaceholder")}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm">{city || "-"}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("streetAddress")}
            </p>
            {isEditing ? (
              <Input
                value={editData.streetAddress}
                onChange={(e) =>
                  handleFieldChange("streetAddress", e.target.value)
                }
                placeholder={tAddress("streetAddressPlaceholder")}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm">{streetAddress || "-"}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("zipCode")}
            </p>
            {isEditing ? (
              <Input
                value={editData.zipCode}
                onChange={(e) => handleFieldChange("zipCode", e.target.value)}
                placeholder={tAddress("zipCodePlaceholder")}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm">{zipCode || "-"}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
