"use client";

import { useTranslations } from "next-intl";
import SettingsItem from "./settings-item";

export function BillingSettings() {
  const t = useTranslations("Settings.billing");

  return (
    <div className="flex flex-col gap-8">
      <SettingsItem
        title={t("plan.title")}
        description={t("plan.description")}
      >
        <div className="text-sm text-muted-foreground">
          {/* TODO: Implement billing plan display */}
        </div>
      </SettingsItem>
    </div>
  );
}
