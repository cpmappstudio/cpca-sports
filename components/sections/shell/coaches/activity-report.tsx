"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ActivityReportPreview } from "./activity-report-preview";
import type {
  CoachActivityDateRange,
  CoachActivityPeriod,
  CoachActivityReportSnapshot,
  CoachActivityReportTranslate,
} from "@/lib/coaches/types";

export function ActivityReport({
  coach,
  range,
  period,
}: {
  coach: CoachActivityReportSnapshot["coach"];
  range: CoachActivityDateRange | null;
  period: CoachActivityPeriod | undefined;
}) {
  const locale = useLocale();
  const t = useTranslations("Coaches");
  const hintId = useId();
  const [hintOpen, setHintOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    data: CoachActivityReportSnapshot;
    translate: CoachActivityReportTranslate;
  } | null>(null);
  if (range && hintOpen) setHintOpen(false);
  if (
    snapshot &&
    (snapshot.data.locale !== locale ||
      snapshot.data.range.from !== range?.from ||
      snapshot.data.range.to !== range?.to ||
      period?.status !== "ready")
  ) {
    setSnapshot(null);
  }
  return (
    <Dialog
      open={snapshot !== null}
      onOpenChange={(open) => {
        if (!open) setSnapshot(null);
      }}
    >
      <div>
        <Tooltip
          open={hintOpen}
          onOpenChange={(open) => setHintOpen(!range && open)}
        >
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 w-full whitespace-normal aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:w-auto"
                disabled={!!range && period?.status !== "ready"}
                aria-disabled={!range || period?.status !== "ready"}
                aria-describedby={!range ? hintId : undefined}
                onClick={(event) => {
                  if (!range || period?.status !== "ready") {
                    event.preventDefault();
                    if (!range) setHintOpen(true);
                    return;
                  }
                  setSnapshot({
                    data: {
                      coach: { ...coach },
                      range: { ...range },
                      period,
                      locale,
                      generatedAt: Date.now(),
                    },
                    translate: t,
                  });
                }}
              >
                <FileText aria-hidden="true" />
                {t("report.generate")}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          {!range ? (
            <TooltipContent sideOffset={6} className="max-w-64">
              {t("report.selectPeriod")}
            </TooltipContent>
          ) : null}
        </Tooltip>
        {!range ? (
          <span id={hintId} className="sr-only">
            {t("report.selectPeriod")}
          </span>
        ) : null}
        {snapshot ? (
          <ActivityReportPreview
            snapshot={snapshot.data}
            translate={snapshot.translate}
            onClose={() => setSnapshot(null)}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
