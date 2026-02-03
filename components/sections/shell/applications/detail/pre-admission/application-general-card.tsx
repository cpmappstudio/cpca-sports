"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Application, getFormField } from "@/lib/applications/types";

interface ApplicationGeneralCardProps {
  application: Application;
  isEditing: boolean;
  onDataChange?: (data: Record<string, string | number | boolean | null>) => void;
}

interface EditableFormData {
  personSubmitting: string;
  howDidYouHear: string;
  needsI20: string;
  message: string;
}

export function ApplicationGeneralCard({
  application,
  isEditing,
  onDataChange,
}: ApplicationGeneralCardProps) {
  const t = useTranslations("Applications.detail");
  const tGeneral = useTranslations("preadmission.general");

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const personSubmitting = getFormField(
    application.formData,
    "general",
    "personSubmitting",
  );
  const howDidYouHear = getFormField(
    application.formData,
    "general",
    "howDidYouHear",
  );
  const needsI20 = getFormField(application.formData, "general", "needsI20");
  const message = getFormField(application.formData, "general", "message");

  const [editData, setEditData] = useState<EditableFormData>({
    personSubmitting,
    howDidYouHear,
    needsI20,
    message,
  });

  useEffect(() => {
    if (!isEditing) {
      setEditData({
        personSubmitting,
        howDidYouHear,
        needsI20,
        message,
      });
    }
  }, [isEditing, personSubmitting, howDidYouHear, needsI20, message]);

  const handleFieldChange = (field: keyof EditableFormData, value: string) => {
    const newData = { ...editData, [field]: value };
    setEditData(newData);
    onDataChange?.(newData);
  };

  const getPersonSubmittingLabel = (value: string) => {
    switch (value) {
      case "self":
        return tGeneral("personSubmittingSelf");
      case "parent":
        return tGeneral("personSubmittingParent");
      case "guidance":
        return tGeneral("personSubmittingGuidance");
      case "administration":
        return tGeneral("personSubmittingAdministration");
      case "coach":
        return tGeneral("personSubmittingCoach");
      default:
        return value || "-";
    }
  };

  const getHowDidYouHearLabel = (value: string) => {
    switch (value) {
      case "socialMedia":
        return tGeneral("howDidYouHearSocialMedia");
      case "friend":
        return tGeneral("howDidYouHearFriend");
      case "coach":
        return tGeneral("howDidYouHearCoach");
      case "teacher":
        return tGeneral("howDidYouHearTeacher");
      case "other":
        return tGeneral("howDidYouHearOther");
      default:
        return value || "-";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("additionalInfo")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("submittedBy")}
            </p>
            {isEditing ? (
              <Select
                value={editData.personSubmitting}
                onValueChange={(value) =>
                  handleFieldChange("personSubmitting", value)
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">
                    {tGeneral("personSubmittingSelf")}
                  </SelectItem>
                  <SelectItem value="parent">
                    {tGeneral("personSubmittingParent")}
                  </SelectItem>
                  <SelectItem value="guidance">
                    {tGeneral("personSubmittingGuidance")}
                  </SelectItem>
                  <SelectItem value="administration">
                    {tGeneral("personSubmittingAdministration")}
                  </SelectItem>
                  <SelectItem value="coach">
                    {tGeneral("personSubmittingCoach")}
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm capitalize">
                {getPersonSubmittingLabel(personSubmitting)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("howDidYouHear")}
            </p>
            {isEditing ? (
              <Select
                value={editData.howDidYouHear}
                onValueChange={(value) =>
                  handleFieldChange("howDidYouHear", value)
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="socialMedia">
                    {tGeneral("howDidYouHearSocialMedia")}
                  </SelectItem>
                  <SelectItem value="friend">
                    {tGeneral("howDidYouHearFriend")}
                  </SelectItem>
                  <SelectItem value="coach">
                    {tGeneral("howDidYouHearCoach")}
                  </SelectItem>
                  <SelectItem value="teacher">
                    {tGeneral("howDidYouHearTeacher")}
                  </SelectItem>
                  <SelectItem value="other">
                    {tGeneral("howDidYouHearOther")}
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm capitalize">
                {getHowDidYouHearLabel(howDidYouHear)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("needsI20")}
            </p>
            {isEditing ? (
              <Select
                value={editData.needsI20}
                onValueChange={(value) => handleFieldChange("needsI20", value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t("yes")}</SelectItem>
                  <SelectItem value="no">{t("no")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm capitalize">
                {needsI20 === "yes" ? t("yes") : t("no")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("submittedAt")}
            </p>
            <p className="text-sm">{formatDate(application._creationTime)}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            {t("message")}
          </h4>
          {isEditing ? (
            <Textarea
              value={editData.message}
              onChange={(e) => handleFieldChange("message", e.target.value)}
              placeholder={tGeneral("messagePlaceholder")}
              rows={5}
              className="resize-none text-sm"
            />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {message || "-"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
