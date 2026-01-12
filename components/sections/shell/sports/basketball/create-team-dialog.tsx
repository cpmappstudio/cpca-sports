"use client";

import { FormEvent, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import AvatarUpload from "@/components/ui/avatar-upload";
import ColorPicker from "@/components/ui/color-picker";
import { useSportTerminology } from "@/lib/sports";
import type { FileWithPreview } from "@/hooks/use-file-upload";

type ClubStatus = "affiliated" | "invited" | "suspended";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
}

interface TeamColor {
  hex: string;
  name: string;
}

interface DelegateState {
  email: string;
}

interface FormState {
  name: string;
  nickname: string;
  conference: string;
  division: string;
  status: ClubStatus;
  colors: TeamColor[];
  delegate: DelegateState;
}

const INITIAL_DELEGATE_STATE: DelegateState = {
  email: "",
};

const INITIAL_FORM_STATE: FormState = {
  name: "",
  nickname: "",
  conference: "",
  division: "",
  status: "invited",
  colors: [],
  delegate: INITIAL_DELEGATE_STATE,
};

export function CreateTeamDialog({
  open,
  onOpenChange,
  orgSlug,
}: CreateTeamDialogProps) {
  const t = useTranslations("Common");
  const terminology = useSportTerminology();
  const createTeamWithDelegate = useMutation(api.clubs.createWithDelegate);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const conferences = useQuery(api.conferences.listByLeague, {
    leagueSlug: orgSlug,
  });

  const [isConferenceOpen, setIsConferenceOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [currentColor, setCurrentColor] = useState("#1E3A8A");
  const [currentColorName, setCurrentColorName] = useState("");
  const [isFetchingColorName, setIsFetchingColorName] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!currentColor || currentColor.length < 4 || editingColorIndex !== null)
      return;

    const hex = currentColor.replace("#", "");
    const controller = new AbortController();

    const fetchColorName = async () => {
      setIsFetchingColorName(true);
      try {
        const response = await fetch(
          `https://www.thecolorapi.com/id?hex=${hex}&format=json`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.name?.value) {
            setCurrentColorName(data.name.value);
          }
        }
      } catch {
        // Ignore abort errors and network failures
      } finally {
        setIsFetchingColorName(false);
      }
    };

    const timeoutId = setTimeout(fetchColorName, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [currentColor, editingColorIndex]);

  const [logoFile, setLogoFile] = useState<FileWithPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (file: FileWithPreview | null) => {
    setLogoFile(file);
  };

  const uploadLogo = async (): Promise<Id<"_storage"> | undefined> => {
    if (!logoFile || !(logoFile.file instanceof File)) {
      return undefined;
    }

    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": logoFile.file.type },
      body: logoFile.file,
    });

    if (!response.ok) {
      throw new Error("Failed to upload logo");
    }

    const { storageId } = await response.json();
    return storageId as Id<"_storage">;
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const logoStorageId = await uploadLogo();
      const colorsToSave = formState.colors.length > 0 ? formState.colors : [];

      // Prepare delegate email if provided
      const delegateEmail = formState.delegate.email.trim() || undefined;

      await createTeamWithDelegate({
        name: formState.name,
        nickname: formState.nickname,
        conferenceName: formState.conference,
        divisionName: formState.division || undefined,
        orgSlug: orgSlug,
        status: formState.status,
        logoStorageId,
        colors:
          colorsToSave.length > 0 ? colorsToSave.map((c) => c.hex) : undefined,
        colorNames:
          colorsToSave.length > 0
            ? colorsToSave.map((c) => c.name).filter(Boolean)
            : undefined,
        delegateEmail,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("[CreateTeam] Failed to create team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setTimeout(() => {
        setIsConferenceOpen(false);
        setFormState(INITIAL_FORM_STATE);
        setLogoFile(null);
        setCurrentColor("#1E3A8A");
        setCurrentColorName("");
        setEditingColorIndex(null);
      }, 150);
    }
  };

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const updateDelegateField = <K extends keyof DelegateState>(
    field: K,
    value: DelegateState[K],
  ) => {
    setFormState((prev) => ({
      ...prev,
      delegate: { ...prev.delegate, [field]: value },
    }));
  };

  const addOrUpdateColor = (hex: string) => {
    if (editingColorIndex !== null) {
      // Update existing color
      const newColors = [...formState.colors];
      newColors[editingColorIndex] = { hex, name: currentColorName };
      updateField("colors", newColors);
      setEditingColorIndex(null);
      setCurrentColorName("");
      setCurrentColor("#1E3A8A");
    } else {
      // Add new color
      if (
        formState.colors.length < 3 &&
        !formState.colors.some((c) => c.hex === hex)
      ) {
        updateField("colors", [
          ...formState.colors,
          { hex, name: currentColorName },
        ]);
        setCurrentColorName("");
        setCurrentColor("#1E3A8A");
      }
    }
  };

  const editColor = (index: number) => {
    setEditingColorIndex(index);
    setCurrentColor(formState.colors[index].hex);
    setCurrentColorName(formState.colors[index].name);
  };

  const cancelEdit = () => {
    setEditingColorIndex(null);
    setCurrentColorName("");
    setCurrentColor("#1E3A8A");
  };

  const removeColor = (index: number) => {
    updateField(
      "colors",
      formState.colors.filter((_, i) => i !== index),
    );
    if (editingColorIndex === index) {
      cancelEdit();
    }
  };

  const isDelegateValid = true;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-left">
            {t("actions.create")} {terminology.club}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateSubmit} className="space-y-6 mt-4">
          <div className="flex flex-col items-center gap-7 md:flex-row">
            <AvatarUpload onFileChange={handleFileChange} />

            <FieldGroup className="flex-1 gap-4">
              <Field>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                  placeholder={t("teams.name")}
                />
              </Field>

              <Field>
                <Input
                  id="nickname"
                  value={formState.nickname}
                  onChange={(event) =>
                    updateField("nickname", event.target.value)
                  }
                  placeholder={t("teams.nickname")}
                />
              </Field>
            </FieldGroup>
          </div>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("teams.conference")}</FieldLabel>
                <Popover
                  open={isConferenceOpen}
                  onOpenChange={setIsConferenceOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isConferenceOpen}
                      className="w-full justify-between"
                      type="button"
                    >
                      {formState.conference || t("teams.conference")}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder={t("teams.conference")}
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>{t("table.noResults")}</CommandEmpty>
                        <CommandGroup>
                          {conferences?.map((option) => (
                            <CommandItem
                              key={option._id}
                              value={option.name}
                              onSelect={(currentValue) => {
                                updateField(
                                  "conference",
                                  currentValue === formState.conference
                                    ? ""
                                    : currentValue,
                                );
                                // Reset division when conference changes
                                updateField("division", "");
                                setIsConferenceOpen(false);
                              }}
                            >
                              {option.name}
                              <Check
                                className={`ml-auto ${
                                  formState.conference === option.name
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </Field>

              <Field>
                <FieldLabel>{t("teams.division")}</FieldLabel>
                <Select
                  value={formState.division}
                  onValueChange={(value) => updateField("division", value)}
                  disabled={!formState.conference}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        formState.conference
                          ? t("teams.division")
                          : t("teams.selectConferenceFirst")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {conferences
                      ?.find((c) => c.name === formState.conference)
                      ?.divisions?.map((division) => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      )) || (
                      <div className="p-2 text-sm text-muted-foreground">
                        {t("teams.noDivisions")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("teams.colors")}</FieldLabel>
                <div className="flex flex-col gap-2">
                  {/* Existing colors with names */}
                  {formState.colors.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {formState.colors.map((color, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="size-6 rounded-full border-2 border-border shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {color.name || "Unnamed"}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => editColor(index)}
                              disabled={
                                editingColorIndex !== null &&
                                editingColorIndex !== index
                              }
                            >
                              {t("actions.edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => removeColor(index)}
                              disabled={
                                editingColorIndex !== null &&
                                editingColorIndex !== index
                              }
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add/Edit color section */}
                  {(formState.colors.length < 3 ||
                    editingColorIndex !== null) && (
                    <div className="flex flex-col gap-2 p-2 border rounded-lg">
                      <p className="text-xs font-medium">
                        {editingColorIndex !== null
                          ? t("actions.edit")
                          : t("actions.add")}
                      </p>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={currentColor}
                          onChange={setCurrentColor}
                          handleAdd={addOrUpdateColor}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            className="size-8 rounded-full border-2 border-border flex items-center justify-center hover:border-primary transition-colors cursor-pointer shrink-0"
                            style={{ backgroundColor: currentColor }}
                          />
                        </ColorPicker>
                        <Input
                          placeholder={t("teams.colorName")}
                          value={currentColorName}
                          onChange={(e) => setCurrentColorName(e.target.value)}
                          className="flex-1 h-8 text-xs"
                          disabled={isFetchingColorName}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addOrUpdateColor(currentColor)}
                          disabled={!currentColorName.trim()}
                        >
                          {editingColorIndex !== null
                            ? t("actions.save")
                            : t("actions.add")}
                        </Button>
                        {editingColorIndex !== null && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={cancelEdit}
                          >
                            {t("actions.cancel")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Field>
              <Field>
                <FieldLabel>{t("teams.status")}</FieldLabel>
                <Select
                  value={formState.status}
                  onValueChange={(value: ClubStatus) =>
                    updateField("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("teams.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="affiliated">
                      {t("teams.statusOptions.affiliated")}
                    </SelectItem>
                    <SelectItem value="invited">
                      {t("teams.statusOptions.invited")}
                    </SelectItem>
                    <SelectItem value="suspended">
                      {t("teams.statusOptions.suspended")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>

          {/* Delegate Section */}
          <Field>
            <FieldLabel>
              {t("teams.delegate")} ({t("actions.optional")})
            </FieldLabel>
            <Input
              type="email"
              value={formState.delegate.email}
              onChange={(e) => updateDelegateField("email", e.target.value)}
              placeholder="delegate@example.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("teams.delegateDescription")}
            </p>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDelegateValid}>
              {isSubmitting ? t("actions.loading") : t("actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
