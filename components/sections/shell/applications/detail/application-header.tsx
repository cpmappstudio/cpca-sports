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
import type { Application } from "@/lib/applications/types";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  BookOpen,
  GraduationCap,
  Calendar,
  Award,
  Mail,
  Phone,
  Globe,
  School,
  Home,
  FileText,
  User,
  IdCard,
} from "lucide-react";
import { useState } from "react";

interface ApplicationHeaderProps {
  application: Application;
  organizationSlug: string;
  isAdmin: boolean;
}

export function ApplicationHeader({
  application,
  organizationSlug,
  isAdmin,
}: ApplicationHeaderProps) {
  const t = useTranslations("Applications.detail");
  const tStatus = useTranslations("Applications.statusOptions");
  const [status, setStatus] = useState(application.status);

  const statusMap = {
    pending: { label: tStatus("pending"), variant: "outline" as const },
    approved: { label: tStatus("approved"), variant: "default" as const },
    rejected: { label: tStatus("rejected"), variant: "destructive" as const },
    under_review: {
      label: tStatus("under_review"),
      variant: "secondary" as const,
    },
  };

  const statusInfo = statusMap[status as keyof typeof statusMap];

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
    <Card>
      <CardContent>
        <div className="space-y-4">
          {/* Primera fila: Foto + Nombre + Estado */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 shrink-0">
              <AspectRatio ratio={1} className="bg-muted rounded-lg">
                <Image
                  src="/avatars/avatar-1.png"
                  alt={`${application.firstName} ${application.lastName}`}
                  fill
                  className="rounded-lg object-cover"
                />
              </AspectRatio>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                {application.firstName} {application.lastName}
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
                      <SelectItem value="under_review">
                        {tStatus("under_review")}
                      </SelectItem>
                      <SelectItem value="approved">
                        {tStatus("approved")}
                      </SelectItem>
                      <SelectItem value="rejected">
                        {tStatus("rejected")}
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
                      <a href={`tel:${application.telephone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9"
                      asChild
                    >
                      <a href={`mailto:${application.email}`}>
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
              <span className="font-semibold text-foreground">Age:</span>
              <span className="text-muted-foreground">
                {calculateAge(application.birthDate)} years
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">
                {t("birthCountry")}:
              </span>
              <span className="text-muted-foreground">
                {application.countryOfBirth}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">
                {t("citizenship")}:
              </span>
              <span className="text-muted-foreground">
                {application.countryOfCitizenship}
              </span>
            </div>
            <hr />
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">
                {t("format")}:
              </span>
              <span className="text-muted-foreground capitalize">
                {application.format}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">
                {t("program")}:
              </span>
              <span className="text-muted-foreground capitalize">
                {application.program}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">
                {t("gradeEntering")}:
              </span>
              <span className="text-muted-foreground">
                {application.gradeEntering}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">
                {t("enrollmentYear")}:
              </span>
              <span className="text-muted-foreground">
                {application.enrollmentYear}
              </span>
            </div>
            <hr />
            <div className="flex items-center gap-2">
              <IdCard className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">I-20:</span>
              <span className="text-muted-foreground">
                {application.needsI20 === "yes" ? t("yes") : t("no")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">
                {t("boarding")}:
              </span>
              <span className="text-muted-foreground">
                {application.interestedInBoarding === "yes"
                  ? t("yes")
                  : t("no")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
