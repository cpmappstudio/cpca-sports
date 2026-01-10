// THIS NEEDS TO BE REFACTORED
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
type DialogStep = "create" | "invite";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
}

interface TeamColor {
  hex: string;
  name: string;
}

interface FormState {
  name: string;
  nickname: string;
  conference: string;
  status: ClubStatus;
  colors: TeamColor[];
}

const INITIAL_FORM_STATE: FormState = {
  name: "",
  nickname: "",
  conference: "",
  status: "invited",
  colors: [],
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export function CreateTeamDialog({
  open,
  onOpenChange,
  orgSlug,
}: CreateTeamDialogProps) {
  const t = useTranslations("Common");
  const terminology = useSportTerminology();
  const createTeam = useMutation(api.clubs.create);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const conferences = useQuery(api.conferences.listByLeague, {
    leagueSlug: orgSlug,
  });

  const [step, setStep] = useState<DialogStep>("create");
  const [direction, setDirection] = useState(0);
  const [isConferenceOpen, setIsConferenceOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [currentColor, setCurrentColor] = useState("#1E3A8A");
  const [currentColorName, setCurrentColorName] = useState("");
  const [isFetchingColorName, setIsFetchingColorName] = useState(false);

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
            // Parse existing names and update/add the current one
            const existingNames = currentColorName
              .split(",")
              .map((n) => n.trim())
              .filter(Boolean);
            const currentIndex = formState.colors.length;
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
  }, [currentColor, formState.colors.length]);
  const [delegateEmail, setDelegateEmail] = useState("");
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

      // Sync color names from input to colors array before saving
      const inputNames = currentColorName
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);

      // If no colors were explicitly added, use the current color from the picker
      const colorsToSave =
        formState.colors.length > 0
          ? formState.colors
          : [{ hex: currentColor, name: inputNames[0] || "" }];

      const colorsWithNames = colorsToSave.map((color, index) => ({
        ...color,
        name: inputNames[index] || color.name,
      }));

      console.log("[CreateTeam] Submitting with data:", {
        name: formState.name,
        nickname: formState.nickname,
        conference: formState.conference,
        status: formState.status,
        logoStorageId,
        colors: colorsWithNames.map((c) => c.hex),
        colorNames: colorsWithNames.map((c) => c.name),
      });

      await createTeam({
        name: formState.name,
        nickname: formState.nickname,
        conferenceName: formState.conference,
        orgSlug: orgSlug,
        status: formState.status,
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

      setDirection(1);
      setStep("invite");
    } catch (error) {
      console.error("[CreateTeam] Failed to create team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Implement Clerk invitation logic
    onOpenChange(false);
  };

  const handleSkipInvite = () => {
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setTimeout(() => {
        setStep("create");
        setDirection(0);
        setIsConferenceOpen(false);
        setFormState(INITIAL_FORM_STATE);
        setDelegateEmail("");
        setLogoFile(null);
        setCurrentColor("#1E3A8A");
        setCurrentColorName("");
      }, 150);
    }
  };

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const addOrUpdateColor = (hex: string) => {
    const colorNames = currentColorName
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    if (formState.colors.length === 0) {
      const nameForThisColor = colorNames[0] || "";
      updateField("colors", [{ hex, name: nameForThisColor }]);
    } else if (!formState.colors.some((c) => c.hex === hex)) {
      if (formState.colors.length < 3) {
        const nameForThisColor = colorNames[formState.colors.length] || "";
        const newColors = [
          ...formState.colors,
          { hex, name: nameForThisColor },
        ];
        updateField("colors", newColors);

        if (nameForThisColor && newColors.length < 3) {
          setCurrentColorName(currentColorName + ", ");
        }
      }
    }
  };

  const removeColor = (hexToRemove: string) => {
    updateField(
      "colors",
      formState.colors.filter((c) => c.hex !== hexToRemove),
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md overflow-hidden"
        showCloseButton={step === "invite"}
      >
        <AnimatePresence mode="wait" custom={direction}>
          {step === "create" && (
            <motion.div
              key="create"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.2 }}
            >
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
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
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
                              <CommandEmpty>
                                {t("table.noResults")}
                              </CommandEmpty>
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

                <Field>
                  <FieldLabel>{t("teams.colors")}</FieldLabel>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      {formState.colors.map((color) => (
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
                      {formState.colors.length < 3 && (
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
                    {formState.colors.length < 3 && (
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    {t("actions.cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t("actions.loading") : t("actions.create")}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}

          {step === "invite" && (
            <motion.div
              key="invite"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="text-left">
                  {t("teams.inviteDelegate")}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleInviteSubmit} className="space-y-6 mt-4">
                <div className="grid w-full items-center gap-3">
                  <Label htmlFor="delegateEmail">{t("teams.delegate")}</Label>
                  <Input
                    id="delegateEmail"
                    type="email"
                    value={delegateEmail}
                    onChange={(event) => setDelegateEmail(event.target.value)}
                    placeholder="delegate@example.com"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkipInvite}
                  >
                    {t("actions.skip")}
                  </Button>
                  <Button type="submit" disabled={!delegateEmail}>
                    {t("actions.sendInvitation")}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
