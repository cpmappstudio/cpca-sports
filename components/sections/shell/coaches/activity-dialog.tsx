"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ChevronDownIcon, ImageIcon, UploadIcon, XIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import type { CoachActivity } from "@/lib/coaches/types";
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
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import {
  APPLICATION_PHOTO_ACCEPT,
  prepareApplicationPhoto,
} from "@/lib/images/application-photo";
import {
  getLocalDateInputValue,
  parseLocalDateInput,
} from "@/lib/coaches/local-date";

type Place = { _id: Id<"programCoachOptions">; name: string };

export function ActivityDialog({
  open,
  onOpenChange,
  coachId,
  places,
  activity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: Id<"coaches">;
  places: Place[];
  activity?: CoachActivity;
}) {
  const [date, setDate] = useState(
    activity?.activityDate ?? getLocalDateInputValue(),
  );
  const [title, setTitle] = useState(
    activity?.title ?? getLocalDateInputValue(),
  );
  const [placeId, setPlaceId] = useState<string>(activity?.placeId ?? "");
  const [startTime, setStartTime] = useState(activity?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(activity?.endTime ?? "09:00");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [completed, setCompleted] = useState(activity?.completed ?? true);
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>();
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("Coaches.activityDialog");
  const generateUploadUrl = useMutation(api.coachActivities.generateUploadUrl);
  const create = useMutation(api.coachActivities.create);
  const update = useMutation(api.coachActivities.update);

  useEffect(() => {
    if (!open) return;
    const today = getLocalDateInputValue();
    setDate(activity?.activityDate ?? today);
    setTitle(activity?.title ?? today);
    setPlaceId(activity?.placeId ?? "");
    setStartTime(activity?.startTime ?? "08:00");
    setEndTime(activity?.endTime ?? "09:00");
    setDescription(activity?.description ?? "");
    setCompleted(activity?.completed ?? true);
    setDateOpen(false);
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, [activity, open]);

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImageUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setSelectedImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const displayedImageUrl = selectedImageUrl ?? activity?.imageUrl;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const image = form.get("image");
    setSaving(true);
    try {
      let imageStorageId: Id<"_storage"> | undefined;
      if (image instanceof File && image.size > 0) {
        const optimizedImage = await prepareApplicationPhoto(image).catch(
          () => {
            throw new Error(t("imageInvalid"));
          },
        );
        const uploadUrl = await generateUploadUrl({
          coachId,
          activityId: activity?._id,
        });
        const upload = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": optimizedImage.type },
          body: optimizedImage,
        });
        if (!upload.ok) throw new Error(t("uploadError"));
        imageStorageId = (
          (await upload.json()) as { storageId: Id<"_storage"> }
        ).storageId;
      }
      if (!activity && !imageStorageId) throw new Error(t("imageRequired"));
      const values = {
        placeId: placeId as Id<"programCoachOptions">,
        activityDate: date,
        startTime,
        endTime,
        title,
        description: description.trim() || undefined,
        completed,
      };
      if (activity)
        await update({ activityId: activity._id, ...values, imageStorageId });
      else
        await create({ coachId, ...values, imageStorageId: imageStorageId! });
      toast.success(activity ? t("updated") : t("created"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {activity ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="activity-title">
              {t("title")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <FieldGroup className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Field className="min-w-0">
              <FieldLabel htmlFor="activity-date">
                {t("date")} <span className="text-destructive">*</span>
              </FieldLabel>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    id="activity-date"
                    className="w-full min-w-0 justify-between overflow-hidden font-normal"
                    aria-required="true"
                  >
                    <span className="truncate">
                      {format(parseLocalDateInput(date), "PPP")}
                    </span>
                    <ChevronDownIcon className="size-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={parseLocalDateInput(date)}
                    captionLayout="dropdown"
                    defaultMonth={parseLocalDateInput(date)}
                    onSelect={(selectedDate) => {
                      if (!selectedDate) return;
                      const next = getLocalDateInputValue(selectedDate);
                      setDate(next);
                      if (title === date) setTitle(next);
                      setDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <Field className="min-w-0">
              <FieldLabel htmlFor="startTime">
                {t("start")} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                required
              />
            </Field>
            <Field className="min-w-0">
              <FieldLabel htmlFor="endTime">
                {t("end")} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                required
              />
            </Field>
          </FieldGroup>
          <div className="space-y-2">
            <Label htmlFor="activity-place">
              {t("place")} <span className="text-destructive">*</span>
            </Label>
            <Select value={placeId} onValueChange={setPlaceId} required>
              <SelectTrigger id="activity-place">
                <SelectValue placeholder={t("selectPlace")} />
              </SelectTrigger>
              <SelectContent>
                {places.map((place) => (
                  <SelectItem key={place._id} value={place._id}>
                    {place.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("descriptionOptional")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-image">
              {activity ? t("imageUnchanged") : t("image")}
              {!activity ? <span className="text-destructive"> *</span> : null}
            </Label>
            <Input
              ref={imageInputRef}
              id="activity-image"
              name="image"
              type="file"
              accept={APPLICATION_PHOTO_ACCEPT}
              className="sr-only"
              disabled={saving}
              onChange={(event) =>
                setSelectedImage(event.target.files?.[0] ?? null)
              }
            />
            <Attachment
              className="w-full"
              state={saving ? "uploading" : displayedImageUrl ? "done" : "idle"}
            >
              <AttachmentMedia variant={displayedImageUrl ? "image" : "icon"}>
                {displayedImageUrl ? (
                  <Image
                    src={displayedImageUrl}
                    alt=""
                    fill
                    sizes="40px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <ImageIcon />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {selectedImage?.name ??
                    (activity?.imageUrl ? t("currentImage") : t("chooseImage"))}
                </AttachmentTitle>
                <AttachmentDescription>
                  {selectedImage
                    ? t("selectedImage", {
                        size: Math.ceil(selectedImage.size / 1024),
                      })
                    : t("imageFormats")}
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                {selectedImage ? (
                  <AttachmentAction
                    type="button"
                    aria-label={t("removeSelectedImage")}
                    disabled={saving}
                    onClick={() => {
                      setSelectedImage(null);
                      if (imageInputRef.current)
                        imageInputRef.current.value = "";
                    }}
                  >
                    <XIcon />
                  </AttachmentAction>
                ) : null}
                <AttachmentAction
                  type="button"
                  aria-label={t("chooseImage")}
                  disabled={saving}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <UploadIcon />
                </AttachmentAction>
              </AttachmentActions>
              <AttachmentTrigger
                aria-label={t("chooseImage")}
                disabled={saving}
                onClick={() => imageInputRef.current?.click()}
              />
            </Attachment>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="completed"
              checked={completed}
              onCheckedChange={(value) => setCompleted(value === true)}
            />
            <Label htmlFor="completed">{t("completed")}</Label>
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
            <Button type="submit" disabled={saving || !placeId}>
              {saving ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
