"use client";

import { useTranslations } from "next-intl";

export function SecuritySettings() {
  const t = useTranslations("Settings.security");

  return (
    <div className="flex flex-col gap-8">
      <p className="text-muted-foreground">{t("placeholder")}</p>
    </div>
  );
}
