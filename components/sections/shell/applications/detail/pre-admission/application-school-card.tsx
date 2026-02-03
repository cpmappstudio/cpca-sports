"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCombobox } from "@/components/ui/country-combobox";
import type { Application } from "@/lib/applications/types";
import { getFormField } from "@/lib/applications/types";

interface ApplicationSchoolCardProps {
  application: Application;
  isEditing: boolean;
  onDataChange?: (data: Record<string, string | number | boolean | null>) => void;
}

interface EditableFormData {
  currentSchoolName: string;
  currentSchoolType: string;
  currentGPA: string;
  schoolAddress: string;
  schoolCity: string;
  schoolCountry: string;
  schoolState: string;
  schoolZipCode: string;
  referenceFullName: string;
  referencePhone: string;
  referenceRelationship: string;
}

export function ApplicationSchoolCard({
  application,
  isEditing,
  onDataChange,
}: ApplicationSchoolCardProps) {
  const t = useTranslations("Applications.detail");
  const tSchool = useTranslations("preadmission.school");

  const { formData } = application;

  const currentSchoolName = getFormField(
    formData,
    "school",
    "currentSchoolName",
  );
  const schoolAddress = getFormField(formData, "school", "schoolAddress");
  const schoolCity = getFormField(formData, "school", "schoolCity");
  const schoolState = getFormField(formData, "school", "schoolState");
  const schoolZipCode = getFormField(formData, "school", "schoolZipCode");
  const schoolCountry = getFormField(formData, "school", "schoolCountry");
  const currentSchoolType = getFormField(
    formData,
    "school",
    "currentSchoolType",
  );
  const currentGPA = getFormField(formData, "school", "currentGPA");
  const referenceFullName = getFormField(
    formData,
    "school",
    "referenceFullName",
  );
  const referenceRelationship = getFormField(
    formData,
    "school",
    "referenceRelationship",
  );
  const referencePhone = getFormField(formData, "school", "referencePhone");

  const [editData, setEditData] = useState<EditableFormData>({
    currentSchoolName,
    currentSchoolType,
    currentGPA,
    schoolAddress,
    schoolCity,
    schoolCountry,
    schoolState,
    schoolZipCode,
    referenceFullName,
    referencePhone,
    referenceRelationship,
  });

  useEffect(() => {
    if (!isEditing) {
      setEditData({
        currentSchoolName,
        currentSchoolType,
        currentGPA,
        schoolAddress,
        schoolCity,
        schoolCountry,
        schoolState,
        schoolZipCode,
        referenceFullName,
        referencePhone,
        referenceRelationship,
      });
    }
  }, [isEditing, currentSchoolName, currentSchoolType, currentGPA, schoolAddress, schoolCity, schoolCountry, schoolState, schoolZipCode, referenceFullName, referencePhone, referenceRelationship]);

  const handleFieldChange = (field: keyof EditableFormData, value: string) => {
    const newData = { ...editData, [field]: value };
    setEditData(newData);
    onDataChange?.(newData);
  };

  const getSchoolTypeLabel = (type: string) => {
    switch (type) {
      case "public":
        return tSchool("schoolTypePublic");
      case "private":
        return tSchool("schoolTypePrivate");
      case "charter":
        return tSchool("schoolTypeCharter");
      case "homeschool":
        return tSchool("schoolTypeHomeschool");
      case "online":
        return tSchool("schoolTypeOnline");
      default:
        return type || "-";
    }
  };

  const fullSchoolAddress = [
    schoolAddress,
    schoolCity,
    schoolState,
    schoolZipCode,
    schoolCountry,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="mb-3">
          <h3 className="text-base font-bold text-foreground">
            {t("schoolInfo")}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("currentSchool")}
            </p>
            {isEditing ? (
              <Input
                value={editData.currentSchoolName}
                onChange={(e) =>
                  handleFieldChange("currentSchoolName", e.target.value)
                }
                placeholder={tSchool("currentSchoolNamePlaceholder")}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm wrap-break-word">
                {currentSchoolName || "-"}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("schoolType")}
            </p>
            {isEditing ? (
              <Select
                value={editData.currentSchoolType}
                onValueChange={(value) =>
                  handleFieldChange("currentSchoolType", value)
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    {tSchool("schoolTypePublic")}
                  </SelectItem>
                  <SelectItem value="private">
                    {tSchool("schoolTypePrivate")}
                  </SelectItem>
                  <SelectItem value="charter">
                    {tSchool("schoolTypeCharter")}
                  </SelectItem>
                  <SelectItem value="homeschool">
                    {tSchool("schoolTypeHomeschool")}
                  </SelectItem>
                  <SelectItem value="online">
                    {tSchool("schoolTypeOnline")}
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm wrap-break-word">
                {getSchoolTypeLabel(currentSchoolType)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">{t("gpa")}</p>
            {isEditing ? (
              <Input
                value={editData.currentGPA}
                onChange={(e) =>
                  handleFieldChange("currentGPA", e.target.value)
                }
                placeholder={tSchool("currentGPAPlaceholder")}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm wrap-break-word">{currentGPA || "-"}</p>
            )}
          </div>

          {isEditing ? (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {tSchool("country")}
                </p>
                <CountryCombobox
                  value={editData.schoolCountry}
                  onValueChange={(value) =>
                    handleFieldChange("schoolCountry", value)
                  }
                  placeholder={tSchool("countryPlaceholder")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {tSchool("state")}
                </p>
                <Input
                  value={editData.schoolState}
                  onChange={(e) =>
                    handleFieldChange("schoolState", e.target.value)
                  }
                  placeholder={tSchool("statePlaceholder")}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {tSchool("city")}
                </p>
                <Input
                  value={editData.schoolCity}
                  onChange={(e) =>
                    handleFieldChange("schoolCity", e.target.value)
                  }
                  placeholder={tSchool("cityPlaceholder")}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {tSchool("addressLine1")}
                </p>
                <Input
                  value={editData.schoolAddress}
                  onChange={(e) =>
                    handleFieldChange("schoolAddress", e.target.value)
                  }
                  placeholder={tSchool("addressLine1Placeholder")}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {tSchool("zipCode")}
                </p>
                <Input
                  value={editData.schoolZipCode}
                  onChange={(e) =>
                    handleFieldChange("schoolZipCode", e.target.value)
                  }
                  placeholder={tSchool("zipCodePlaceholder")}
                  className="h-8 text-sm"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">
                {t("schoolAddress")}
              </p>
              <p className="text-sm wrap-break-word">
                {fullSchoolAddress || "-"}
              </p>
            </div>
          )}
        </div>

        <div>
          <h4 className="text-base font-bold text-foreground mb-3">
            {t("reference")}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">
                {t("referenceName")}
              </p>
              {isEditing ? (
                <Input
                  value={editData.referenceFullName}
                  onChange={(e) =>
                    handleFieldChange("referenceFullName", e.target.value)
                  }
                  placeholder={tSchool("referenceFullNamePlaceholder")}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm">{referenceFullName || "-"}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">
                {t("referenceRelationship")}
              </p>
              {isEditing ? (
                <Input
                  value={editData.referenceRelationship}
                  onChange={(e) =>
                    handleFieldChange("referenceRelationship", e.target.value)
                  }
                  placeholder={tSchool("referenceRelationshipPlaceholder")}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm">{referenceRelationship || "-"}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">
                {t("referencePhone")}
              </p>
              {isEditing ? (
                <Input
                  type="tel"
                  value={editData.referencePhone}
                  onChange={(e) =>
                    handleFieldChange("referencePhone", e.target.value)
                  }
                  placeholder={tSchool("referencePhonePlaceholder")}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm">{referencePhone || "-"}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
