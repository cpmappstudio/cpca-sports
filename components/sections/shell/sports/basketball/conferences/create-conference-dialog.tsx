"use client";

import { FormEvent, useState, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CreateConferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
}

interface FormState {
  name: string;
  shortName: string;
  region: string;
  divisions: string[];
}

const INITIAL_FORM_STATE: FormState = {
  name: "",
  shortName: "",
  region: "",
  divisions: [],
};

const REGION_SUGGESTIONS = [
  "East",
  "West",
  "North",
  "South",
  "Central",
  "Northeast",
  "Southeast",
  "Northwest",
  "Southwest",
  "Midwest",
];

export function CreateConferenceDialog({
  open,
  onOpenChange,
  orgSlug,
}: CreateConferenceDialogProps) {
  const t = useTranslations("Common");
  const createConference = useMutation(api.conferences.create);

  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [divisionInput, setDivisionInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await createConference({
        name: formState.name,
        shortName: formState.shortName || undefined,
        leagueSlug: orgSlug,
        region: formState.region || undefined,
        divisions:
          formState.divisions.length > 0 ? formState.divisions : undefined,
      });

      setFormState(INITIAL_FORM_STATE);
      setDivisionInput("");
      onOpenChange(false);
    } catch (error) {
      console.error(
        "[CreateConferenceDialog] Error creating conference:",
        error,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormState(INITIAL_FORM_STATE);
    setDivisionInput("");
    onOpenChange(false);
  };

  const handleAddDivision = () => {
    const trimmed = divisionInput.trim();
    if (trimmed && !formState.divisions.includes(trimmed)) {
      setFormState({
        ...formState,
        divisions: [...formState.divisions, trimmed],
      });
      setDivisionInput("");
    }
  };

  const handleDivisionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddDivision();
    }
  };

  const handleRemoveDivision = (division: string) => {
    setFormState({
      ...formState,
      divisions: formState.divisions.filter((d) => d !== division),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {t("actions.create")} {t("conferences.name")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="name">
                    {t("conferences.name")} *
                  </FieldLabel>
                  <Input
                    id="name"
                    value={formState.name}
                    onChange={(e) =>
                      setFormState({ ...formState, name: e.target.value })
                    }
                    placeholder="Atlantic Conference"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="shortName">
                    {t("conferences.shortName")}
                  </FieldLabel>
                  <Input
                    id="shortName"
                    value={formState.shortName}
                    onChange={(e) =>
                      setFormState({ ...formState, shortName: e.target.value })
                    }
                    placeholder="ACC"
                  />
                </Field>
              </div>
            </FieldGroup>

            <Field>
              <FieldLabel htmlFor="region">
                {t("conferences.region")}
              </FieldLabel>
              <Input
                id="region"
                list="region-suggestions"
                value={formState.region}
                onChange={(e) =>
                  setFormState({ ...formState, region: e.target.value })
                }
                placeholder="East, West, Central..."
              />
              <datalist id="region-suggestions">
                {REGION_SUGGESTIONS.map((region) => (
                  <option key={region} value={region} />
                ))}
              </datalist>
            </Field>

            <Field>
              <FieldLabel>{t("conferences.divisions")}</FieldLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={divisionInput}
                    onChange={(e) => setDivisionInput(e.target.value)}
                    onKeyDown={handleDivisionKeyDown}
                    placeholder="East, West..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDivision}
                    disabled={!divisionInput.trim()}
                  >
                    {t("actions.add")}
                  </Button>
                </div>
                {formState.divisions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formState.divisions.map((division) => (
                      <Badge key={division} variant="secondary">
                        {division}
                        <button
                          type="button"
                          onClick={() => handleRemoveDivision(division)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !formState.name}>
              {isSubmitting ? t("actions.saving") : t("actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
