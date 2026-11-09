"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Clock, Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { COACH_ACTIVITY_TIME_ZONE } from "@/convex/lib/coachActivityTime";
import type { CoachActivity } from "@/lib/coaches/types";
import { formatActivityTimestamp } from "@/lib/coaches/activity-time";
import { activityErrorKey } from "@/lib/coaches/activity-errors";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { ActivityCameraCapture } from "./activity-camera";

export type ActivityAction = "checkIn" | "checkOut" | "edit";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: Id<"coaches">;
  action: ActivityAction;
  activityId?: Id<"coachActivities">;
};

export function ActivityDialog({
  open,
  onOpenChange,
  coachId,
  action,
  activityId,
}: DialogProps) {
  const t = useTranslations("Coaches.activityDialog");
  const [saving, setSaving] = useState(false);
  const activity = useQuery(
    api.coachActivities.getById,
    open && activityId ? { activityId } : "skip",
  );
  const ready = action === "checkIn" || Boolean(activity);
  const closed =
    action === "checkOut" && activity && activity.status !== "in_progress";
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) onOpenChange(value);
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!saving}
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t(`${action}Title`)}</DialogTitle>
          <DialogDescription>{t(`${action}Description`)}</DialogDescription>
        </DialogHeader>
        {open && ready && !closed ? (
          <ActivityForm
            key={`${action}-${activityId ?? "new"}`}
            coachId={coachId}
            action={action}
            activity={activity ?? undefined}
            saving={saving}
            onSavingChange={setSaving}
            onClose={() => onOpenChange(false)}
          />
        ) : open ? (
          <div className="space-y-4">
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              {activity === undefined && action !== "checkIn" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("loading")}
                </>
              ) : closed ? (
                t("errors.activityNotOpen")
              ) : (
                t("errors.activityNotFound")
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ActivityForm({
  coachId,
  action,
  activity,
  saving,
  onSavingChange,
  onClose,
}: {
  coachId: Id<"coaches">;
  action: ActivityAction;
  activity?: CoachActivity;
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Coaches.activityDialog");
  const locale = useLocale();
  const [title, setTitle] = useState(activity?.title ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [placeId, setPlaceId] = useState(activity?.placeId ?? "");
  const [step, setStep] = useState<"details" | "photo">(
    action === "checkOut" ? "photo" : "details",
  );
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [uploaded, setUploaded] = useState<Id<"_storage"> | null>(null);
  const submitting = useRef(false);
  const places = useQuery(
    api.coachOptions.listPlacesForCoach,
    action === "checkOut" ? "skip" : { coachId, activityId: activity?._id },
  );
  const generateUploadUrl = useMutation(api.coachActivities.generateUploadUrl);
  const checkIn = useMutation(api.coachActivities.checkIn);
  const checkOut = useMutation(api.coachActivities.checkOut);
  const update = useMutation(api.coachActivities.update);
  const capture = (value: Blob | null) => {
    setPhoto(value);
    setUploaded(null);
  };

  const save = async () => {
    if (submitting.current || (action !== "edit" && !photo)) return;
    submitting.current = true;
    onSavingChange(true);
    try {
      const details = {
        placeId: placeId as Id<"programCoachOptions">,
        title: title.trim(),
        description: description.trim() || undefined,
      };
      if (action === "edit") {
        await update({ activityId: activity!._id, ...details });
      } else {
        let storageId = uploaded;
        if (!storageId) {
          const url = await generateUploadUrl({
            coachId,
            activityId: action === "checkOut" ? activity!._id : undefined,
          });
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": photo!.type },
            body: photo,
          });
          if (!response.ok) throw new Error("uploadError");
          const result: unknown = await response.json();
          if (
            !result ||
            typeof result !== "object" ||
            !("storageId" in result) ||
            typeof result.storageId !== "string"
          )
            throw new Error("uploadError");
          storageId = result.storageId as Id<"_storage">;
          setUploaded(storageId);
        }
        if (action === "checkIn")
          await checkIn({
            coachId,
            ...details,
            imageStorageId: storageId,
          });
        else
          await checkOut({
            activityId: activity!._id,
            imageStorageId: storageId,
          });
      }
      toast.success(t(`${action}Success`));
      onClose();
    } catch (error) {
      toast.error(t(`errors.${activityErrorKey(error)}`));
    } finally {
      submitting.current = false;
      onSavingChange(false);
    }
  };

  const submitDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !placeId || saving) return;
    if (action === "edit") void save();
    else setStep("photo");
  };
  const currentStep = action === "checkOut" ? 3 : step === "photo" ? 1 : 0;

  return (
    <div className="space-y-5">
      {action !== "edit" ? (
        <ol className="grid grid-cols-4 gap-2" aria-label={t("progress")}>
          {["details", "entry", "activity", "exit"].map((name, index) => (
            <li
              key={name}
              aria-current={index === currentStep ? "step" : undefined}
              className={`border-b-2 pb-3 text-center text-xs ${index === currentStep ? "border-primary font-semibold text-primary" : "border-muted text-muted-foreground"}`}
            >
              <span className="mx-auto mb-2 flex size-6 items-center justify-center rounded-full border">
                {index < currentStep ? <Check className="size-3" /> : index + 1}
              </span>
              {t(`steps.${name}`)}
            </li>
          ))}
        </ol>
      ) : null}
      {step === "details" ? (
        <form className="space-y-4" onSubmit={submitDetails}>
          {action === "checkIn" ? (
            <Alert
              variant="primary"
              appearance="outline"
              role="note"
              aria-labelledby="activity-time-notice-title"
              className="gap-3 rounded-xl border-primary/20 bg-primary/5 p-4"
            >
              <AlertIcon>
                <Clock aria-hidden="true" />
              </AlertIcon>
              <AlertContent className="min-w-0 flex-1 space-y-2">
                <AlertTitle
                  id="activity-time-notice-title"
                  className="text-sm font-semibold"
                >
                  {t("automaticTimeTitle")}
                </AlertTitle>
                <AlertDescription className="leading-relaxed text-muted-foreground">
                  {t("automaticTime")}
                </AlertDescription>
                <div className="inline-flex rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-primary">
                  {t("timeZoneNotice", { timeZone: COACH_ACTIVITY_TIME_ZONE })}
                </div>
              </AlertContent>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="activity-title">
              {t("title")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={saving}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-description">
              {t("descriptionOptional")}
            </Label>
            <Textarea
              id="activity-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
              className="min-h-24 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-place">
              {t("place")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={placeId}
              onValueChange={(value) => {
                setPlaceId(value as Id<"programCoachOptions">);
              }}
              disabled={saving}
              required
            >
              <SelectTrigger
                id="activity-place"
                className="min-h-11 w-full text-base"
              >
                <SelectValue placeholder={t("selectPlace")} />
              </SelectTrigger>
              <SelectContent>
                {places?.map((place) => (
                  <SelectItem key={place._id} value={place._id}>
                    {place.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {places === undefined ? (
              <p className="text-sm text-muted-foreground" role="status">
                {t("loadingPlaces")}
              </p>
            ) : places.length === 0 ? (
              <p className="text-sm text-destructive" role="alert">
                {t("missingPlaces")}
              </p>
            ) : null}
          </div>
          {action === "edit" ? (
            <p className="text-xs text-muted-foreground">
              {t("fixedEvidence")}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="min-h-11 font-normal text-muted-foreground"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={saving || !title.trim() || !placeId || !places?.length}
              className="min-h-11"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {action === "edit" ? t("saveChanges") : t("continue")}{" "}
              {action === "checkIn" ? <ArrowRight /> : null}
            </Button>
          </DialogFooter>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="break-words font-medium">
                {activity?.title ?? title}
              </p>
              <p className="text-sm text-muted-foreground">
                {activity?.placeName ??
                  places?.find((place) => place._id === placeId)?.name}
              </p>
              {activity?.checkInAt !== undefined ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("entryTime", {
                    time: formatActivityTimestamp(activity.checkInAt, locale),
                  })}
                </p>
              ) : null}
            </div>
            {action === "checkIn" ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="min-h-11 px-0 font-normal text-muted-foreground"
                disabled={saving}
                onClick={() => {
                  setStep("details");
                  capture(null);
                }}
              >
                <ArrowLeft />
                {t("editDetails")}
              </Button>
            ) : null}
          </div>
          <ActivityCameraCapture
            photo={photo}
            onCapture={capture}
            disabled={saving}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="min-h-11 font-normal text-muted-foreground"
            >
              {t("cancel")}
            </Button>
            {photo ? (
              <Button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="min-h-11"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {saving ? t("saving") : t(`${action}Confirm`)}
              </Button>
            ) : null}
          </DialogFooter>
        </div>
      )}
    </div>
  );
}
