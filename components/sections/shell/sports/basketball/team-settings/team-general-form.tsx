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
  const [logoFile, setLogoFile] = useState<FileWithPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentColor || currentColor.length < 4) return;

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
            const existingNames = currentColorName
              .split(",")
              .map((n) => n.trim())
              .filter(Boolean);
            const currentIndex = colors.length;
            existingNames[currentIndex] = data.name.value;
            setCurrentColorName(existingNames.join(", "));
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
  }, [currentColor, colors.length]);

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

      const inputNames = currentColorName
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);

      const colorsToSave =
        colors.length > 0
          ? colors
          : currentColor
            ? [{ hex: currentColor, name: inputNames[0] || "" }]
            : [];

      const colorsWithNames = colorsToSave.map((color, index) => ({
        ...color,
        name: inputNames[index] || color.name,
      }));

      await updateTeam({
        clubId: team._id as Id<"clubs">,
        name,
        nickname,
        conferenceName: conference,
        status,
        logoStorageId,
        colors:
          colorsWithNames.length > 0
            ? colorsWithNames.map((c) => c.hex)
            : undefined,
        colorNames:
          colorsWithNames.length > 0
            ? colorsWithNames.map((c) => c.name).filter(Boolean)
            : undefined,
      });
    } catch (error) {
      console.error("[TeamGeneralForm] Failed to update team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOrUpdateColor = (hex: string) => {
    const colorNames = currentColorName
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    if (colors.length === 0) {
      const nameForThisColor = colorNames[0] || "";
      setColors([{ hex, name: nameForThisColor }]);
    } else if (!colors.some((c) => c.hex === hex)) {
      if (colors.length < 3) {
        const nameForThisColor = colorNames[colors.length] || "";
        const newColors = [...colors, { hex, name: nameForThisColor }];
        setColors(newColors);

        if (nameForThisColor && newColors.length < 3) {
          setCurrentColorName(currentColorName + ", ");
        }
      }
    }
  };

  const removeColor = (hexToRemove: string) => {
    setColors(colors.filter((c) => c.hex !== hexToRemove));
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
            <FieldLabel>{t("teams.name")}</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t("teams.name")}
            />
          </Field>

          <Field>
            <FieldLabel>{t("teams.nickname")}</FieldLabel>
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
          <div className="flex items-center gap-2">
            {colors.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => removeColor(color.hex)}
                className="group relative size-8 rounded-full border-2 border-border"
                style={{ backgroundColor: color.hex }}
              >
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 rounded-full">
                  <X className="size-4 text-white" />
                </span>
              </button>
            ))}
            {colors.length < 3 && (
              <ColorPicker
                value={currentColor}
                onChange={setCurrentColor}
                handleAdd={addOrUpdateColor}
              >
                <div
                  role="button"
                  tabIndex={0}
                  className="size-8 rounded-full border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors cursor-pointer"
                  style={{ backgroundColor: currentColor }}
                />
              </ColorPicker>
            )}
          </div>
          {colors.length < 3 && (
            <Input
              placeholder={t("teams.colorName")}
              value={currentColorName}
              onChange={(e) => setCurrentColorName(e.target.value)}
              className="max-w-[200px]"
              disabled={isFetchingColorName}
            />
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
