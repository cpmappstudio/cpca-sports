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
  const { pendingCount, unknownDurationCount } = result.summary;
  if (!pendingCount && !unknownDurationCount) return null;
  return (
    <div role="status" className="space-y-1 text-xs text-muted-foreground">
      {pendingCount > 0 ? (
        <p>{t("pendingExcluded", { count: pendingCount })}</p>
      ) : null}
      {unknownDurationCount > 0 ? (
        <p>{t("unknownExcluded", { count: unknownDurationCount })}</p>
      ) : null}
    </div>
  );
}
