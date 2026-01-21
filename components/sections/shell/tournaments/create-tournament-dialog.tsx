"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

type Gender = "male" | "female" | "mixed";

interface AgeCategory {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
}

interface CreateTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
}

interface FormState {
  name: string;
  selectedCategories: string[];
  selectedConferences: string[];
  gender: Gender;
  registrationDeadline: string;
}

const INITIAL_FORM_STATE: FormState = {
  name: "",
  selectedCategories: [],
  selectedConferences: [],
  gender: "male",
  registrationDeadline: "",
};

export function CreateTournamentDialog({
  open,
  onOpenChange,
  orgSlug,
}: CreateTournamentDialogProps) {
  const t = useTranslations("Common");
  const createTournament = useMutation(api.tournaments.create);
  const teamConfig = useQuery(api.leagueSettings.getTeamConfig, {
    leagueSlug: orgSlug,
  });
  const conferences = useQuery(api.conferences.listByLeague, {
    leagueSlug: orgSlug,
  });

  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isConferencesOpen, setIsConferencesOpen] = useState(false);

  const ageCategories: AgeCategory[] = teamConfig?.ageCategories || [];
  const enabledGenders = (teamConfig?.enabledGenders as Gender[]) || [
    "male",
    "female",
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !formState.name ||
      formState.selectedCategories.length === 0 ||
      !formState.gender
    )
      return;

    setIsSubmitting(true);
    try {
      await createTournament({
        leagueSlug: orgSlug,
        name: formState.name,
        ageGroups: formState.selectedCategories,
        conferences: formState.selectedConferences,
        gender: formState.gender,
        registrationDeadline: formState.registrationDeadline || undefined,
      });
      setFormState(INITIAL_FORM_STATE);
      onOpenChange(false);
    } catch (error) {
      console.error(
        "[CreateTournamentDialog] Failed to create tournament:",
        error,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormState(INITIAL_FORM_STATE);
    }
    onOpenChange(newOpen);
  };

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (categoryName: string) => {
    setFormState((prev) => {
      const isSelected = prev.selectedCategories.includes(categoryName);
      return {
        ...prev,
        selectedCategories: isSelected
          ? prev.selectedCategories.filter((c) => c !== categoryName)
          : [...prev.selectedCategories, categoryName],
      };
    });
  };

  const toggleConference = (conferenceName: string) => {
    setFormState((prev) => {
      const isSelected = prev.selectedConferences.includes(conferenceName);
      return {
        ...prev,
        selectedConferences: isSelected
          ? prev.selectedConferences.filter((c) => c !== conferenceName)
          : [...prev.selectedConferences, conferenceName],
      };
    });
  };

  const toggleAllConferences = () => {
    const allConferenceNames = conferences?.map((c) => c.name) || [];
    const allSelected =
      formState.selectedConferences.length === allConferenceNames.length;
    setFormState((prev) => ({
      ...prev,
      selectedConferences: allSelected ? [] : allConferenceNames,
    }));
  };

  const isFormValid =
    formState.name &&
    formState.selectedCategories.length > 0 &&
    formState.selectedConferences.length > 0 &&
    formState.gender;

  const selectedCategoriesLabel =
    formState.selectedCategories.length === 0
      ? t("tournaments.selectCategories")
      : formState.selectedCategories.length === 1
        ? formState.selectedCategories[0]
        : `${formState.selectedCategories.length} ${t("categories.title").toLowerCase()}`;

  const allConferenceNames = conferences?.map((c) => c.name) || [];
  const allConferencesSelected =
    allConferenceNames.length > 0 &&
    formState.selectedConferences.length === allConferenceNames.length;

  const selectedConferencesLabel =
    formState.selectedConferences.length === 0
      ? t("tournaments.selectConferences")
      : formState.selectedConferences.length === allConferenceNames.length
        ? t("actions.all")
        : formState.selectedConferences.length === 1
          ? formState.selectedConferences[0]
          : `${formState.selectedConferences.length} ${t("conferences.title").toLowerCase()}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left">
            {t("actions.create")} {t("tournaments.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel>{t("tournaments.name")}</FieldLabel>
              <Input
                value={formState.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder={t("tournaments.name")}
                className="mt-2"
                required
              />
            </div>

            <div>
              <FieldLabel>{t("tournaments.ageGroup")}</FieldLabel>
              <Popover
                open={isCategoriesOpen}
                onOpenChange={setIsCategoriesOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isCategoriesOpen}
                    className="w-full justify-between mt-2"
                    type="button"
                  >
                    {selectedCategoriesLabel}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput
                      placeholder={t("tournaments.searchCategories")}
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>{t("table.noResults")}</CommandEmpty>
                      <CommandGroup>
                        {ageCategories.map((cat) => {
                          const isSelected =
                            formState.selectedCategories.includes(cat.name);
                          return (
                            <CommandItem
                              key={cat.id}
                              value={cat.name}
                              onSelect={() => toggleCategory(cat.name)}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  className="pointer-events-none"
                                />
                                <span>
                                  {cat.name} ({cat.minAge}-{cat.maxAge})
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <FieldLabel>{t("tournaments.gender")}</FieldLabel>
              <Select
                value={formState.gender}
                onValueChange={(value) =>
                  updateField("gender", value as Gender)
                }
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder={t("tournaments.gender")} />
                </SelectTrigger>
                <SelectContent>
                  {enabledGenders.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {t(`gender.${gender}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel>{t("tournaments.registrationDeadline")}</FieldLabel>
              <Input
                type="date"
                value={formState.registrationDeadline}
                onChange={(e) =>
                  updateField("registrationDeadline", e.target.value)
                }
                className="mt-2"
              />
            </div>

            <div>
              <FieldLabel>{t("conferences.title")}</FieldLabel>
              <Popover
                open={isConferencesOpen}
                onOpenChange={setIsConferencesOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isConferencesOpen}
                    className="w-full justify-between mt-2"
                    type="button"
                  >
                    {selectedConferencesLabel}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput
                      placeholder={t("tournaments.searchConferences")}
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>{t("table.noResults")}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={toggleAllConferences}>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={allConferencesSelected}
                              className="pointer-events-none"
                            />
                            <span className="font-medium">
                              {t("actions.selectAll")}
                            </span>
                          </div>
                          {allConferencesSelected && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </CommandItem>
                        {(conferences || []).map((conf) => {
                          const isSelected =
                            formState.selectedConferences.includes(conf.name);
                          return (
                            <CommandItem
                              key={conf._id}
                              value={conf.name}
                              onSelect={() => toggleConference(conf.name)}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  className="pointer-events-none"
                                />
                                <span>{conf.name}</span>
                              </div>
                              {isSelected && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isFormValid}>
              {isSubmitting ? t("actions.loading") : t("actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
