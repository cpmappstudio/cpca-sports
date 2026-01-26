"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Application, ApplicationStatus } from "@/lib/applications/types";
import { getFormField } from "@/lib/applications/types";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ApplicationPhoto } from "../application-photo";
import { Id } from "@/convex/_generated/dataModel";
import {
  BookOpen,
  GraduationCap,
  Calendar,
  Mail,
  Phone,
  Globe,
  Home,
  FileText,
  User,
  IdCard,
} from "lucide-react";
import { useState } from "react";
import { ApplicationBalanceCard } from "./application-balance-card";

interface ApplicationHeaderProps {
  application: Application;
  organizationSlug: string;
  isAdmin: boolean;
  totalDue: number;
  totalPaid: number;
  totalPending: number;
}

export function ApplicationHeader({
  application,
  organizationSlug,
  isAdmin,
  totalDue,
  totalPaid,
  totalPending,
}: ApplicationHeaderProps) {
  const t = useTranslations("Applications.detail");
  const tStatus = useTranslations("Applications.statusOptions");
  const [status, setStatus] = useState<ApplicationStatus>(application.status);

  const { formData } = application;
  const firstName = getFormField(formData, "athlete", "firstName");
  const lastName = getFormField(formData, "athlete", "lastName");
  const email = getFormField(formData, "athlete", "email");
  const telephone = getFormField(formData, "athlete", "telephone");
  const birthDate = getFormField(formData, "athlete", "birthDate");
  const countryOfBirth = getFormField(formData, "athlete", "countryOfBirth");
  const countryOfCitizenship = getFormField(
    formData,
    "athlete",
    "countryOfCitizenship",
  );
  const format = getFormField(formData, "athlete", "format");
  const program = getFormField(formData, "athlete", "program");
  const gradeEntering = getFormField(formData, "athlete", "gradeEntering");
  const enrollmentYear = getFormField(formData, "athlete", "enrollmentYear");
  const needsI20 = getFormField(formData, "athlete", "needsI20");
  const interestedInBoarding = getFormField(
    formData,
    "general",
    "interestedInBoarding",
  );
  const photoStorageId = formData.athlete?.photo as Id<"_storage"> | undefined;

  const statusMap = {
    pending: { label: tStatus("pending"), variant: "outline" as const },
    reviewing: { label: tStatus("reviewing"), variant: "secondary" as const },
    "pre-admitted": {
      label: tStatus("pre-admitted"),
      variant: "default" as const,
    },
    admitted: { label: tStatus("admitted"), variant: "default" as const },
    denied: { label: tStatus("denied"), variant: "destructive" as const },
  };

  const statusInfo = statusMap[status];

  const handleStatusChange = (newStatus: typeof status) => {
    setStatus(newStatus);
    // TODO: Llamar a la mutación de Convex para actualizar el estado
    console.log("Status changed to:", newStatus);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <section className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 shrink-0">
                {photoStorageId ? (
                  <ApplicationPhoto
                    storageId={photoStorageId}
                    alt={`${firstName} ${lastName}`}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-md bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-2xl font-semibold">
                      {firstName.charAt(0).toUpperCase()}
                      {lastName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  {firstName} {lastName}
                </h1>
                <div className="flex items-start gap-2 mt-1">
                  {isAdmin ? (
                    <Select value={status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-fit h-7 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          {tStatus("pending")}
                        </SelectItem>
                        <SelectItem value="reviewing">
                          {tStatus("reviewing")}
                        </SelectItem>
                        <SelectItem value="pre-admitted">
                          {tStatus("pre-admitted")}
                        </SelectItem>
                        <SelectItem value="admitted">
                          {tStatus("admitted")}
                        </SelectItem>
                        <SelectItem value="denied">
                          {tStatus("denied")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={statusInfo.variant} className="w-fit">
                      {statusInfo.label}
                    </Badge>
                  )}
                  {isAdmin && (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        asChild
                      >
                        <a href={`tel:${telephone}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        asChild
                      >
                        <a href={`mailto:${email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr />

            {/* Segunda fila: Grid con campos clave */}
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {t("age")}:
                </span>
                <span className="text-muted-foreground">
                  {birthDate ? `${calculateAge(birthDate)} years` : "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {t("birthCountry")}:
                </span>
                <span className="text-muted-foreground">
                  {countryOfBirth || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {t("citizenship")}:
                </span>
                <span className="text-muted-foreground">
                  {countryOfCitizenship || "-"}
                </span>
              </div>
              <hr />
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {t("format")}:
                </span>
                <span className="text-muted-foreground capitalize">
                  {format || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {t("program")}:
                </span>
                <span className="text-muted-foreground capitalize">
                  {program || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {t("gradeEntering")}:
                </span>
                <span className="text-muted-foreground">
                  {gradeEntering || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {t("enrollmentYear")}:
                </span>
                <span className="text-muted-foreground">
                  {enrollmentYear || "-"}
                </span>
              </div>
              <hr />
              <div className="flex items-center gap-2">
                <IdCard className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">I-20:</span>
                <span className="text-muted-foreground">
                  {needsI20 === "yes" ? t("yes") : t("no")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {t("boarding")}:
                </span>
                <span className="text-muted-foreground">
                  {interestedInBoarding === "yes" ? t("yes") : t("no")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <ApplicationBalanceCard
        totalDue={totalDue}
        totalPaid={totalPaid}
        totalPending={totalPending}
      />
    </section>
  );
}
