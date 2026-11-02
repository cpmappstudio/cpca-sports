"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getProgramSummaryFields,
  getSelectedSummaryFields,
} from "@/lib/applications/summary-fields";
import type { ProgramFormDefinition } from "./form-builder/types";

interface ProgramSummarySettingsProps {
  definition: ProgramFormDefinition;
  selectedIds?: string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}

export function ProgramSummarySettings({
  definition,
  selectedIds,
  disabled,
  onChange,
}: ProgramSummarySettingsProps) {
  const t = useTranslations("Programs.create.summary");
  const id = useId();
  const fields = getProgramSummaryFields(definition);
  const selected = new Set(
    getSelectedSummaryFields(definition, selectedIds).map(
      ({ field }) => field.id,
    ),
  );

  return (
    <Accordion type="single" collapsible className="rounded-lg border px-4">
      <AccordionItem value="summary" className="border-0">
        <AccordionTrigger>{t("title")}</AccordionTrigger>
        <AccordionContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{t("description")}</p>
          <p className="text-sm text-muted-foreground">{t("fixedFields")}</p>
          {fields.length === 0 ? <p className="text-sm">{t("empty")}</p> : null}
          {definition.steps.map((step) => {
            const sectionFields = fields.filter(
              ({ sectionKey }) => sectionKey === step.id,
            );
            if (!sectionFields.length) return null;
            return (
              <fieldset key={step.id} className="space-y-3">
                <legend className="mb-2 font-medium">{step.title}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sectionFields.map(({ field }) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-${field.id}`}
                        checked={selected.has(field.id)}
                        disabled={disabled}
                        onCheckedChange={(checked) => {
                          const next = new Set(selected);
                          if (checked === true) next.add(field.id);
                          else next.delete(field.id);
                          onChange(
                            fields
                              .filter(({ field }) => next.has(field.id))
                              .map(({ field }) => field.id),
                          );
                        }}
                      />
                      <Label htmlFor={`${id}-${field.id}`}>
                        {field.label || field.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
