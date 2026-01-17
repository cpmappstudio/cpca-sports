"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSportTerminology } from "@/lib/sports";
import SettingsItem from "./settings-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";

interface AgeCategory {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
}

type Gender = "male" | "female" | "mixed";
type DivisionType = "alphabetic" | "greek" | "numeric";

export function TeamConfigSettings() {
  const params = useParams();
  const leagueSlug = params.tenant as string;
  const t = useTranslations("Settings.general.teamConfig");
  const tCommon = useTranslations("Common");
  const terminology = useSportTerminology();

  const teamConfig = useQuery(api.leagueSettings.getTeamConfig, { leagueSlug });
  const addAgeCategory = useMutation(api.leagueSettings.addAgeCategory);
  const removeAgeCategory = useMutation(api.leagueSettings.removeAgeCategory);
  const updateEnabledGenders = useMutation(
    api.leagueSettings.updateEnabledGenders,
  );
  const updateHorizontalDivisions = useMutation(
    api.leagueSettings.updateHorizontalDivisions,
  );

  const [newCategory, setNewCategory] = useState({
    name: "",
    minAge: "",
    maxAge: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<AgeCategory | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const ageCategories: AgeCategory[] = teamConfig?.ageCategories || [];
  const enabledGenders: Gender[] = (teamConfig?.enabledGenders as Gender[]) || [
    "male",
    "female",
  ];
  const horizontalDivisions = teamConfig?.horizontalDivisions || {
    enabled: false,
    type: "alphabetic" as DivisionType,
  };

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.minAge || !newCategory.maxAge) return;

    setIsAdding(true);
    try {
      await addAgeCategory({
        leagueSlug,
        category: {
          id: crypto.randomUUID(),
          name: newCategory.name,
          minAge: parseInt(newCategory.minAge, 10),
          maxAge: parseInt(newCategory.maxAge, 10),
        },
      });
      setNewCategory({ name: "", minAge: "", maxAge: "" });
    } catch (error) {
      console.error("[TeamConfigSettings] Failed to add category:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      await removeAgeCategory({
        leagueSlug,
        categoryId: categoryToDelete.id,
      });
      setCategoryToDelete(null);
    } catch (error) {
      console.error("[TeamConfigSettings] Failed to delete category:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenderToggle = async (gender: Gender, checked: boolean) => {
    const newGenders = checked
      ? [...enabledGenders, gender]
      : enabledGenders.filter((g) => g !== gender);

    if (newGenders.length === 0) return;

    try {
      await updateEnabledGenders({
        leagueSlug,
        enabledGenders: newGenders,
      });
    } catch (error) {
      console.error("[TeamConfigSettings] Failed to update genders:", error);
    }
  };

  const handleHorizontalDivisionsToggle = async (enabled: boolean) => {
    try {
      await updateHorizontalDivisions({
        leagueSlug,
        horizontalDivisions: {
          enabled,
          type: horizontalDivisions.type as DivisionType,
        },
      });
    } catch (error) {
      console.error(
        "[TeamConfigSettings] Failed to update horizontal divisions:",
        error,
      );
    }
  };

  const handleDivisionTypeChange = async (type: DivisionType) => {
    try {
      await updateHorizontalDivisions({
        leagueSlug,
        horizontalDivisions: {
          enabled: horizontalDivisions.enabled,
          type,
        },
      });
    } catch (error) {
      console.error(
        "[TeamConfigSettings] Failed to update division type:",
        error,
      );
    }
  };

  const clubs = terminology.clubs;

  return (
    <div className="flex flex-col gap-8">
      <SettingsItem
        title={t("ageCategories.title")}
        description={t("ageCategories.description", { clubs })}
      >
        <div className="flex flex-col gap-4">
          {ageCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("ageCategories.empty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {ageCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {category.minAge} - {category.maxAge}{" "}
                      {tCommon("playerCard.age").toLowerCase()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setCategoryToDelete(category)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("ageCategories.name")}
              </Label>
              <Input
                placeholder={t("ageCategories.namePlaceholder")}
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                className="w-32"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("ageCategories.minAge")}
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={newCategory.minAge}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, minAge: e.target.value })
                }
                className="w-20"
                min={0}
                max={99}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("ageCategories.maxAge")}
              </Label>
              <Input
                type="number"
                placeholder="99"
                value={newCategory.maxAge}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, maxAge: e.target.value })
                }
                className="w-20"
                min={0}
                max={99}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground invisible">
                &nbsp;
              </Label>
              <Button
                onClick={handleAddCategory}
                disabled={
                  isAdding ||
                  !newCategory.name ||
                  !newCategory.minAge ||
                  !newCategory.maxAge
                }
                size="icon"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </SettingsItem>

      <SettingsItem
        title={t("enabledGenders.title")}
        description={t("enabledGenders.description", { clubs })}
      >
        <div className="flex flex-wrap gap-6">
          {(["male", "female", "mixed"] as const).map((gender) => {
            const isChecked = enabledGenders.includes(gender);
            const isDisabled =
              enabledGenders.length === 1 && enabledGenders.includes(gender);

            return (
              <div key={gender} className="flex items-center gap-2">
                <Checkbox
                  checked={isChecked}
                  onChange={(checked: boolean) =>
                    handleGenderToggle(gender, checked)
                  }
                  disabled={isDisabled}
                />
                <Label className="cursor-pointer">
                  {t(`enabledGenders.${gender}`)}
                </Label>
              </div>
            );
          })}
        </div>
      </SettingsItem>

      <SettingsItem
        title={t("horizontalDivisions.title")}
        description={t("horizontalDivisions.description", { clubs })}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={horizontalDivisions.enabled}
              onChange={handleHorizontalDivisionsToggle}
            />
            <Label>{t("horizontalDivisions.enabled")}</Label>
          </div>

          {horizontalDivisions.enabled && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("horizontalDivisions.type")}
              </Label>
              <Select
                value={horizontalDivisions.type}
                onValueChange={(value) =>
                  handleDivisionTypeChange(value as DivisionType)
                }
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alphabetic">
                    {t("horizontalDivisions.types.alphabetic")}
                  </SelectItem>
                  <SelectItem value="greek">
                    {t("horizontalDivisions.types.greek")}
                  </SelectItem>
                  <SelectItem value="numeric">
                    {t("horizontalDivisions.types.numeric")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </SettingsItem>

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={() => setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("ageCategories.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("ageCategories.deleteDescription", {
                name: categoryToDelete?.name ?? "",
                clubs,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {tCommon("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting
                ? tCommon("actions.loading")
                : tCommon("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
