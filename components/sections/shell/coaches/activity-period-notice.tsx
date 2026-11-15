"use client";

import { useTranslations } from "next-intl";
import type { CoachActivityPeriod } from "@/lib/coaches/types";

export function ActivityPeriodNotice({
  result,
}: {
  result: CoachActivityPeriod | undefined;
}) {
  const t = useTranslations("Coaches.period");
  if (!result) return null;
  if (result.status === "limitExceeded")
    return (
      <p
        role="alert"
        className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
      >
        {t("limitExceeded")}
      </p>
    );
  const { unknownDurationCount } = result.summary;
  if (!unknownDurationCount) return null;
  return (
    <p role="status" className="text-xs text-muted-foreground">
      {t("unknownExcluded", { count: unknownDurationCount })}
    </p>
  );
}
