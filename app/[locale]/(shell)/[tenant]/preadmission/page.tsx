"use client";

import { PreAdmissionForm } from "@/components/sections/shell/preadmission/preadmission-form";
import { Heading } from "@/components/ui/heading";
import { useTranslations } from "next-intl";

export default function PreadmissionPage() {
  const t = useTranslations("preadmission");

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <Heading className="text-2xl sm:text-3xl lg:text-4xl">
          {t("title")}
        </Heading>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <PreAdmissionForm />
    </div>
  );
}
