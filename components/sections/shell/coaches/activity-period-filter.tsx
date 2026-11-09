"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  activityPresetRange,
  formatActivityDate,
} from "@/lib/coaches/activity-period";
import {
  isActivityDate,
  COACH_ACTIVITY_TIME_ZONE,
} from "@/convex/lib/coachActivityTime";
import type {
  CoachActivityPeriodPreset,
  CoachActivityPeriodSelection,
} from "@/lib/coaches/types";

const presets: CoachActivityPeriodPreset[] = [
  "all",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
  "custom",
];

export function ActivityPeriodFilter({
  selection,
  onChange,
}: {
  selection: CoachActivityPeriodSelection;
  onChange: (selection: CoachActivityPeriodSelection) => void;
}) {
  const t = useTranslations("Coaches.period");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const changeOpen = (value: boolean) => {
    if (value) setDraft(selection.range ?? activityPresetRange("thisWeek"));
    setOpen(value);
  };
  const valid =
    isActivityDate(draft.from) &&
    isActivityDate(draft.to) &&
    draft.from <= draft.to;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Select
          value={selection.preset}
          onValueChange={(value) => {
            const preset = value as CoachActivityPeriodPreset;
            if (preset === "custom") changeOpen(true);
            else
              onChange({
                preset,
                range: preset === "all" ? null : activityPresetRange(preset),
              });
          }}
        >
          <SelectTrigger
            aria-label={t("label")}
            className="min-h-11 w-full sm:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset} value={preset}>
                {t(preset)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover open={open} onOpenChange={changeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-h-11 max-w-full flex-1 sm:flex-none"
            >
              <CalendarRange className="shrink-0" />
              <span className="truncate">
                {selection.range
                  ? `${formatActivityDate(selection.range.from, locale)} – ${formatActivityDate(selection.range.to, locale)}`
                  : t("custom")}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-80 max-w-[calc(100vw-2rem)] space-y-4"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!valid) return;
                onChange({ preset: "custom", range: draft });
                setOpen(false);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="activity-period-from">{t("from")}</Label>
                  <Input
                    id="activity-period-from"
                    type="date"
                    required
                    value={draft.from}
                    max={draft.to || undefined}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        from: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="activity-period-to">{t("to")}</Label>
                  <Input
                    id="activity-period-to"
                    type="date"
                    required
                    value={draft.to}
                    min={draft.from || undefined}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        to: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("inclusiveDates")}
              </p>
              <Button
                type="submit"
                disabled={!valid}
                className="min-h-11 w-full"
              >
                {t("apply")}
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
