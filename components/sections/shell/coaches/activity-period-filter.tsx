"use client";

import { useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
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
import { isActivityDate } from "@/convex/lib/coachActivityTime";
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
  reportAction,
}: {
  selection: CoachActivityPeriodSelection;
  onChange: (selection: CoachActivityPeriodSelection) => void;
  reportAction?: ReactNode;
}) {
  const t = useTranslations("Coaches.period");
  const locale = useLocale();
  const presetTrigger = useRef<HTMLButtonElement>(null);
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
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverAnchor asChild>
        <div className="flex flex-wrap items-start gap-2">
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
              ref={presetTrigger}
              aria-label={t("label")}
              className="min-h-11 min-w-28 flex-1 sm:w-44 sm:flex-none"
            >
              <SelectValue className="min-w-0 truncate" />
            </SelectTrigger>
            <SelectContent
              onCloseAutoFocus={(event) => {
                if (open) event.preventDefault();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
            >
              {presets.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {t(preset)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selection.preset === "custom" ? (
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="order-last min-h-11 w-full min-w-0 whitespace-normal sm:order-none sm:w-auto"
              >
                <CalendarRange className="shrink-0" />
                <span>
                  {selection.range
                    ? `${formatActivityDate(selection.range.from, locale)} – ${formatActivityDate(selection.range.to, locale)}`
                    : t("custom")}
                </span>
              </Button>
            </PopoverTrigger>
          ) : null}
          {reportAction}
          {selection.range && selection.preset !== "custom" ? (
            <p className="order-last basis-full text-xs text-muted-foreground">
              {formatActivityDate(selection.range.from, locale)} –{" "}
              {formatActivityDate(selection.range.to, locale)}
            </p>
          ) : null}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] space-y-4"
        onCloseAutoFocus={(event) => {
          if (selection.preset !== "custom") {
            event.preventDefault();
            presetTrigger.current?.focus();
          }
        }}
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
          <Button type="submit" disabled={!valid} className="min-h-11 w-full">
            {t("apply")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
