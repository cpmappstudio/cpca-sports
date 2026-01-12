"use client";

import { FormEvent, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { FileWithPreview } from "@/hooks/use-file-upload";

type ClubStatus = "affiliated" | "invited" | "suspended";

interface TeamColor {
  hex: string;
  name: string;
}

interface TeamGeneralFormProps {
  team: {
    _id: string;
    name: string;
    slug: string;
    shortName?: string | null;
    logoUrl?: string | null;
    conferenceName?: string | null;
    divisionName?: string | null;
    status: string;
    colors?: string[] | null;
    colorNames?: string[] | null;
  };
  orgSlug: string;
}

export function TeamGeneralForm({ team, orgSlug }: TeamGeneralFormProps) {
  const t = useTranslations("Common");
  const updateTeam = useMutation(api.clubs.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const conferences = useQuery(api.conferences.listByLeague, {
    leagueSlug: orgSlug,
  });

  const [isConferenceOpen, setIsConferenceOpen] = useState(false);
  const [name, setName] = useState(team.name);
  const [nickname, setNickname] = useState(team.shortName || "");
  const [conference, setConference] = useState(team.conferenceName || "");
  const [division, setDivision] = useState(team.divisionName || "");
  const [status, setStatus] = useState<ClubStatus>(team.status as ClubStatus);
  const [colors, setColors] = useState<TeamColor[]>(() => {
    if (team.colors && team.colors.length > 0) {
      return team.colors.map((hex, index) => ({
        hex,
        name: team.colorNames?.[index] || "",
      }));
    }
    return [];
  });
  const [currentColor, setCurrentColor] = useState("#1E3A8A");
  const [currentColorName, setCurrentColorName] = useState("");
  const [isFetchingColorName, setIsFetchingColorName] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(
    null,
  );
  const [logoFile, setLogoFile] = useState<FileWithPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const logoStorageId = await uploadLogo();

      const colorsToSave = colors.length > 0 ? colors : [];

      await updateTeam({
        clubId: team._id as Id<"clubs">,
        name,
        nickname,
        conferenceName: conference,
        divisionName: division || undefined,
        status,
        logoStorageId,
        colors:
          colorsToSave.length > 0 ? colorsToSave.map((c) => c.hex) : undefined,
        colorNames:
          colorsToSave.length > 0
            ? colorsToSave.map((c) => c.name).filter(Boolean)
            : undefined,
      });
    } catch (error) {
      console.error("[TeamGeneralForm] Failed to update team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOrUpdateColor = (hex: string) => {
    if (editingColorIndex !== null) {
      // Update existing color
      const newColors = [...colors];
      newColors[editingColorIndex] = { hex, name: currentColorName };
      setColors(newColors);
      setEditingColorIndex(null);
      setCurrentColorName("");
      setCurrentColor("#1E3A8A");
    } else {
      // Add new color
      if (colors.length < 3 && !colors.some((c) => c.hex === hex)) {
        setColors([...colors, { hex, name: currentColorName }]);
        setCurrentColorName("");
        setCurrentColor("#1E3A8A");
      }
    }
  };

  const editColor = (index: number) => {
    setEditingColorIndex(index);
    setCurrentColor(colors[index].hex);
    setCurrentColorName(colors[index].name);
  };

  const cancelEdit = () => {
    setEditingColorIndex(null);
    setCurrentColorName("");
    setCurrentColor("#1E3A8A");
  };

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
    if (editingColorIndex === index) {
      cancelEdit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-7 md:flex-row md:items-start">
        <AvatarUpload
          onFileChange={handleFileChange}
          defaultAvatar={team.logoUrl || undefined}
        />

        <FieldGroup className="flex-1 gap-4">
          <Field>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t("teams.name")}
            />
          </Field>

          <Field>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t("teams.nickname")}
            />
          </Field>
        </FieldGroup>
      </div>

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{t("teams.conference")}</FieldLabel>
            <Popover open={isConferenceOpen} onOpenChange={setIsConferenceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isConferenceOpen}
                  className="w-full justify-between"
                  type="button"
                >
                  {conference || t("teams.conference")}
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
                            setConference(
                              currentValue === conference ? "" : currentValue,
                            );
                            // Reset division when conference changes
                            setDivision("");
                            setIsConferenceOpen(false);
                          }}
                        >
                          {option.name}
                          <Check
                            className={`ml-auto ${
                              conference === option.name
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
              value={division}
              onValueChange={(value) => setDivision(value)}
              disabled={!conference}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    conference
                      ? t("teams.division")
                      : t("teams.selectConferenceFirst")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {conferences
                  ?.find((c) => c.name === conference)
                  ?.divisions?.map((div) => (
                    <SelectItem key={div} value={div}>
                      {div}
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
            <FieldLabel>{t("teams.status")}</FieldLabel>
            <Select
              value={status}
              onValueChange={(value: ClubStatus) => setStatus(value)}
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

      <Field>
        <FieldLabel>{t("teams.colors")}</FieldLabel>
        <div className="flex flex-col gap-3">
          {/* Existing colors with names */}
          {colors.length > 0 && (
            <div className="flex flex-col gap-2">
              {colors.map((color, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div
                    className="size-8 rounded-full border-2 border-border shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {color.name || "Unnamed"}
                    </p>
                    <p className="text-xs text-muted-foreground">{color.hex}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
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
                      onClick={() => removeColor(index)}
                      disabled={
                        editingColorIndex !== null &&
                        editingColorIndex !== index
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit color section */}
          {(colors.length < 3 || editingColorIndex !== null) && (
            <div className="flex flex-col gap-2 p-3 border rounded-lg">
              <p className="text-sm font-medium">
                {editingColorIndex !== null
                  ? t("actions.edit") + " Color"
                  : t("actions.add") + " Color"}
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
                    className="size-10 rounded-full border-2 border-border flex items-center justify-center hover:border-primary transition-colors cursor-pointer"
                    style={{ backgroundColor: currentColor }}
                  />
                </ColorPicker>
                <Input
                  placeholder={t("teams.colorName")}
                  value={currentColorName}
                  onChange={(e) => setCurrentColorName(e.target.value)}
                  className="flex-1"
                  disabled={isFetchingColorName}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
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

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("actions.saving") : t("actions.save")}
        </Button>
      </div>
    </form>
  );
}
