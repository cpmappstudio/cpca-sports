"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatActivityTimestamp } from "@/lib/coaches/activity-time";
import { Button } from "@/components/ui/button";

export function ActivityTimeHistory({
  activityId,
}: {
  activityId: Id<"coachActivities">;
}) {
  const t = useTranslations("Coaches.timeAdjustment");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const result = useQuery(
    api.coachActivityAdjustments.listByActivity,
    open
      ? {
          activityId,
          paginationOpts: { numItems: 5, cursor: cursors[cursors.length - 1] },
        }
      : "skip",
  );
  return (
    <details
      className="min-w-0 border-t pt-4"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-ring">
        {t("history")}
      </summary>
      {open ? (
        <div className="mt-4 space-y-4">
          {result === undefined ? (
            <p className="text-sm text-muted-foreground" role="status">
              {t("loading")}
            </p>
          ) : result.page.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyHistory")}</p>
          ) : (
            <ol className="space-y-4">
              {result.page.map((entry) => (
                <li
                  key={entry._id}
                  className="space-y-2 border-b pb-4 text-sm last:border-0"
                >
                  <p className="font-medium break-words">
                    {entry.adjustedByName || t("administrator")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatActivityTimestamp(entry.adjustedAt, locale)}
                  </p>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {(["before", "after"] as const).map((kind) => (
                      <div key={kind} className="min-w-0 space-y-1">
                        <dt className="text-xs font-medium">{t(kind)}</dt>
                        <dd className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            {t("entryTime", {
                              time: formatActivityTimestamp(
                                entry[kind].checkInAt,
                                locale,
                              ),
                            })}
                          </p>
                          <p>
                            {entry[kind].checkOutAt === null
                              ? t("pendingCheckoutShort")
                              : t("exitTime", {
                                  time: formatActivityTimestamp(
                                    entry[kind].checkOutAt,
                                    locale,
                                  ),
                                })}
                          </p>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ol>
          )}
          {cursors.length > 1 || (result && !result.isDone) ? (
            <nav aria-label={t("history")} className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cursors.length === 1 || !result}
                onClick={() => setCursors(cursors.slice(0, -1))}
              >
                {t("previous")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!result || result.isDone}
                onClick={() =>
                  result && setCursors([...cursors, result.continueCursor])
                }
              >
                {t("next")}
              </Button>
            </nav>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}
