"use client";

import { useTranslations } from "next-intl";
import SettingsItem from "./settings-item";

export function GeneralSettings() {
  const t = useTranslations("Settings.general");

  return (
    <div className="flex flex-col gap-8">
      <SettingsItem
        title={t("title")}
        description={t("description")}
      >
        <div className="text-muted-foreground text-sm">
          {t("placeholder")}
        </div>
      </SettingsItem>
    </div>
  );
}
