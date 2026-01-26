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
  Pencil,
} from "lucide-react";
import { useState, useRef } from "react";
import { ApplicationBalanceCard } from "./application-balance-card";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useImageUpload } from "@/hooks/use-image-upload";

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

  const { formData } = application;

  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<Id<"_storage"> | null>(
    (formData.athlete?.photo as Id<"_storage">) || null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateStatus = useMutation(api.applications.updateStatus);
  const updatePhoto = useMutation(api.applications.updatePhoto);

  const { uploadImage, isUploading } = useImageUpload({
    onSuccess: async (storageId) => {
      try {
        await updatePhoto({
          applicationId: application._id,
          photoStorageId: storageId,
        });
        setCurrentPhoto(storageId);
        toast.success("Photo updated successfully");
      } catch {
        toast.error("Failed to update photo. Please try again.");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      toast.error(error);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

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

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!isAdmin) return;

    setIsUpdatingStatus(true);
    try {
      await updateStatus({
        applicationId: application._id,
        status: newStatus,
      });

      setStatus(newStatus);
      toast.success(
        `Application status updated to: ${statusMap[newStatus].label}`,
      );
    } catch {
      toast.error("Failed to update application status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
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

  const isUpdating = isUpdatingStatus || isUploading;

  return (
    <section className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 shrink-0 relative">
                {currentPhoto ? (
                  <ApplicationPhoto
                    storageId={currentPhoto}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-6 w-6 opacity-70 hover:opacity-100 hover:scale-100 transition-all duration-200"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Pencil className="h-2 w-2" />
                </Button>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  {firstName} {lastName}
                </h1>
                <div className="flex items-start gap-2 mt-1">
                  {isAdmin ? (
                    <Select
                      value={status}
                      onValueChange={handleStatusChange}
                      disabled={isUpdating}
                    >
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
