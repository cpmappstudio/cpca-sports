"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  activityLocalDateTime,
  activityTimeCandidates,
  COACH_ACTIVITY_TIME_ZONE,
} from "@/convex/lib/coachActivityTime";
import type { CoachActivityTimeAdjustment } from "@/lib/coaches/types";
import {
  activityTimeAdjustmentPreview,
  formatActivityDuration,
  formatActivityTimestamp,
} from "@/lib/coaches/activity-time";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function TimeField({
  kind,
  value,
  original,
  disabled,
  error,
  onChange,
}: {
  kind: "checkIn" | "checkOut";
  value: CoachActivityTimeAdjustment["checkIn"];
  original?: number;
  disabled: boolean;
  error?: string;
  onChange: (value: CoachActivityTimeAdjustment["checkIn"]) => void;
}) {
  const t = useTranslations("Coaches.timeAdjustment");
  const locale = useLocale();
  const [date, time] = value.dateTime.split("T");
  const candidates = activityTimeCandidates(date, time);
  const originalOffset =
    original !== undefined && value.dateTime === activityLocalDateTime(original)
      ? candidates.find(
          (item) =>
            Math.floor(item.timestamp / 60000) === Math.floor(original / 60000),
        )?.offsetMinutes
      : undefined;
  const offset = value.offsetMinutes ?? originalOffset;
  const id = `activity-${kind}-time`;
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{t(kind)}</Label>
      <Input
        id={id}
        type="datetime-local"
        value={value.dateTime}
        onChange={(event) => onChange({ dateTime: event.target.value })}
        required={original !== undefined}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={`activity-adjustment-zone${error ? ` ${id}-error` : ""}`}
        className="min-h-11 min-w-0 text-base"
      />
      {candidates.length > 1 ? (
        <div className="space-y-2">
          <Label htmlFor={`${id}-offset`}>{t("repeatedTime")}</Label>
          <Select
            value={offset === undefined ? "" : String(offset)}
            onValueChange={(next) =>
              onChange({ ...value, offsetMinutes: Number(next) })
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${id}-offset`} className="min-h-11 w-full">
              <SelectValue placeholder={t("chooseOccurrence")} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((item) => (
                <SelectItem
                  key={item.offsetMinutes}
                  value={String(item.offsetMinutes)}
                >
                  {formatActivityTimestamp(item.timestamp, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ActivityTimeFields({
  value,
  disabled,
  canAddCheckout = false,
  onChange,
}: {
  value: CoachActivityTimeAdjustment;
  disabled: boolean;
  canAddCheckout?: boolean;
  onChange: (value: CoachActivityTimeAdjustment) => void;
}) {
  const t = useTranslations("Coaches.timeAdjustment");
  const errors = useTranslations("Coaches.activityDialog.errors");
  const detail = useTranslations("Coaches.detail");
  const preview = activityTimeAdjustmentPreview(value);
  return (
    <section
      aria-labelledby="activity-adjustment-title"
      className="min-w-0 space-y-4 border-t pt-2"
    >
      <h3 id="activity-adjustment-title" className="text-sm font-semibold">
        {t("title")}
      </h3>
      <p
        id="activity-adjustment-zone"
        className="text-xs text-muted-foreground"
      >
        {detail("timeZoneNotice", { timeZone: COACH_ACTIVITY_TIME_ZONE })}
      </p>
      {canAddCheckout ? (
        <p className="text-sm text-muted-foreground">
          {t("reconciliationHelp")}
        </p>
      ) : null}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TimeField
          kind="checkIn"
          value={value.checkIn}
          original={value.expectedCheckInAt}
          disabled={disabled}
          error={
            preview.errorField === "checkIn" && preview.error
              ? errors(preview.error)
              : undefined
          }
          onChange={(checkIn) => onChange({ ...value, checkIn })}
        />
        {value.expectedCheckOutAt !== null || canAddCheckout ? (
          <TimeField
            kind="checkOut"
            value={value.checkOut ?? { dateTime: "" }}
            original={value.expectedCheckOutAt ?? undefined}
            disabled={disabled}
            error={
              preview.errorField === "checkOut" && preview.error
                ? errors(preview.error)
                : undefined
            }
            onChange={(checkOut) =>
              onChange({
                ...value,
                checkOut:
                  checkOut.dateTime || value.expectedCheckOutAt !== null
                    ? checkOut
                    : null,
              })
            }
          />
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("checkOut")}</p>
            <p className="flex min-h-11 items-center text-sm text-muted-foreground">
              {t("pendingCheckoutShort")}
            </p>
          </div>
        )}
      </div>
      {!preview.error && value.checkOut ? (
        <p className="text-sm" role="status">
          {t("duration", {
            duration: formatActivityDuration(preview.durationMs, detail),
          })}
        </p>
      ) : null}
    </section>
  );
}
