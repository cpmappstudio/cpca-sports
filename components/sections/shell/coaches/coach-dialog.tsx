"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import type { CoachDetail } from "@/lib/coaches/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  APPLICATION_PHOTO_ACCEPT,
  prepareApplicationPhoto,
} from "@/lib/images/application-photo";

type Program = Pick<Doc<"programs">, "_id" | "name">;

export function CoachDialog({
  open,
  onOpenChange,
  tenant,
  programs,
  coach,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: string;
  programs: Program[];
  coach?: CoachDetail;
  onSaved?: (coachId: Id<"coaches">) => void;
}) {
  const [programId, setProgramId] = useState<string>(
    coach?.coach.programId ?? "",
  );
  const [positionId, setPositionId] = useState<string>(
    coach?.coach.positionId ?? "",
  );
  const [active, setActive] = useState(coach?.user.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const t = useTranslations("Coaches.coachDialog");
  const options = useQuery(
    api.coachOptions.listByProgram,
    open && programId ? { programId: programId as Id<"programs"> } : "skip",
  );
  const positions =
    options?.filter((option) => option.kind === "position") ?? [];

  useEffect(() => {
    if (!open) return;
    setProgramId(coach?.coach.programId ?? "");
    setPositionId(coach?.coach.positionId ?? "");
    setActive(coach?.user.isActive ?? true);
  }, [coach, open]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const image = form.get("image");
    form.set("programId", programId);
    form.set("positionId", positionId);
    form.set("isActive", String(active));
    setSaving(true);
    try {
      if (image instanceof File && image.size > 0) {
        form.set(
          "image",
          await prepareApplicationPhoto(image).catch(() => {
            throw new Error(t("imageInvalid"));
          }),
        );
      }
      const response = await fetch(
        coach
          ? `/api/organizations/${tenant}/coaches/${coach.coach._id}`
          : `/api/organizations/${tenant}/coaches`,
        { method: coach ? "PATCH" : "POST", body: form },
      );
      const result = (await response.json()) as {
        coachId?: Id<"coaches">;
        error?: string;
      };
      if (!response.ok || !result.coachId)
        throw new Error(result.error || t("saveError"));
      toast.success(coach ? t("updated") : t("created"));
      onOpenChange(false);
      onSaved?.(result.coachId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{coach ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                {t("firstName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={coach?.user.firstName}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                {t("lastName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={coach?.user.lastName}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              {t("email")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={coach?.user.email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {coach ? t("newPassword") : t("temporaryPassword")}
              {!coach ? <span className="text-destructive"> *</span> : null}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required={!coach}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">{t("image")}</Label>
            <Input
              id="image"
              name="image"
              type="file"
              accept={APPLICATION_PHOTO_ACCEPT}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coach-program">
              {t("program")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={programId}
              onValueChange={(value) => {
                setProgramId(value);
                setPositionId("");
              }}
              required
            >
              <SelectTrigger id="coach-program">
                <SelectValue placeholder={t("selectProgram")} />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program._id} value={program._id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coach-position">
              {t("position")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={positionId}
              onValueChange={setPositionId}
              required
              disabled={!programId}
            >
              <SelectTrigger id="coach-position">
                <SelectValue placeholder={t("selectPosition")} />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position._id} value={position._id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {programId && options !== undefined && positions.length === 0 ? (
              <p className="text-xs text-destructive">
                {t("missingPositions")}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={active}
              onCheckedChange={(value) => setActive(value === true)}
            />
            <Label htmlFor="isActive">{t("activeLogin")}</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={saving || !programId || !positionId}
            >
              {saving ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
