"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Check,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRoundCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Kind = "position" | "place";
type ProgramCoachOption = FunctionReturnType<
  typeof api.coachOptions.listByProgram
>[number];

function OptionGroup({
  programId,
  kind,
  title,
  description,
  options,
}: {
  programId: Id<"programs">;
  kind: Kind;
  title: string;
  description: string;
  options: ProgramCoachOption[];
}) {
  const createOption = useMutation(api.coachOptions.create);
  const renameOption = useMutation(api.coachOptions.rename);
  const removeOption = useMutation(api.coachOptions.remove);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingOptionId, setEditingOptionId] =
    useState<Id<"programCoachOptions"> | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const t = useTranslations("Coaches.programOptions");
  const filtered = options.filter((option) => option.kind === kind);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createOption({ programId, kind, name });
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("addError"));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (option: ProgramCoachOption) => {
    const nextName = editName.trim();
    if (!nextName) return;
    if (nextName === option.name) {
      setEditingOptionId(null);
      return;
    }
    setSavingEdit(true);
    try {
      await renameOption({ optionId: option._id, name: nextName });
      setEditingOptionId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("renameError"));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          {kind === "position" ? (
            <UserRoundCog className="size-4" />
          ) : (
            <MapPin className="size-4" />
          )}
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor={`${kind}-name`} className="sr-only">
              {title}
            </Label>
            <Input
              id={`${kind}-name`}
              value={name}
              placeholder={
                kind === "position"
                  ? t("positionPlaceholder")
                  : t("placePlaceholder")
              }
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void add();
                }
              }}
            />
          </div>
          <Button
            type="button"
            size="icon"
            disabled={saving || !name.trim()}
            onClick={() => void add()}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <ul className="space-y-1" role="list">
          {filtered.map((option) => (
            <li
              key={option._id}
              className="group flex min-h-8 items-center gap-2 text-sm"
            >
              <span className="text-primary" aria-hidden="true">
                •
              </span>
              {editingOptionId === option._id ? (
                <>
                  <Input
                    value={editName}
                    aria-label={t("editOption", { name: option.name })}
                    className="h-8 max-w-sm"
                    autoFocus
                    disabled={savingEdit}
                    onChange={(event) => setEditName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveEdit(option);
                      }
                      if (event.key === "Escape") setEditingOptionId(null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t("saveOption")}
                    disabled={savingEdit || !editName.trim()}
                    onClick={() => void saveEdit(option)}
                  >
                    <Check />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t("cancelEdit")}
                    disabled={savingEdit}
                    onClick={() => setEditingOptionId(null)}
                  >
                    <X />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-primary">{option.name}</span>
                  <div className="flex items-center opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("editOption", { name: option.name })}
                      onClick={() => {
                        setEditingOptionId(option._id);
                        setEditName(option.name);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:text-destructive"
                      aria-label={t("deleteOption", { name: option.name })}
                      onClick={() =>
                        void removeOption({ optionId: option._id }).catch(
                          (error) =>
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : t("deleteError"),
                            ),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="py-4 text-center text-sm text-muted-foreground">
              {t("empty")}
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}

export function ProgramCoachOptions({
  programId,
}: {
  programId: Id<"programs">;
}) {
  const t = useTranslations("Coaches.programOptions");
  const options = useQuery(api.coachOptions.listByProgram, { programId });
  if (options === undefined) return null;
  return (
    <div className="space-y-8 pt-6">
      <OptionGroup
        programId={programId}
        kind="position"
        title={t("positions")}
        description={t("positionsDescription")}
        options={options}
      />
      <OptionGroup
        programId={programId}
        kind="place"
        title={t("places")}
        description={t("placesDescription")}
        options={options}
      />
    </div>
  );
}
