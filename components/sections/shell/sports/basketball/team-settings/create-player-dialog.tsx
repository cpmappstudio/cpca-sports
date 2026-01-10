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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

type BasketballPosition =
  | "point_guard"
  | "shooting_guard"
  | "small_forward"
  | "power_forward"
  | "center";

interface CreatePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubSlug: string;
}

const POSITION_OPTIONS: { value: BasketballPosition; label: string }[] = [
  { value: "point_guard", label: "Point Guard (PG)" },
  { value: "shooting_guard", label: "Shooting Guard (SG)" },
  { value: "small_forward", label: "Small Forward (SF)" },
  { value: "power_forward", label: "Power Forward (PF)" },
  { value: "center", label: "Center (C)" },
];

export function CreatePlayerDialog({
  open,
  onOpenChange,
  clubSlug,
}: CreatePlayerDialogProps) {
  const t = useTranslations("Common");
  const createPlayer = useMutation(api.players.createPlayer);

  const categories = useQuery(api.categories.listByClubSlug, {
    clubSlug,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState<BasketballPosition | "">("");
  const [nationality, setNationality] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhoneNumber("");
    setDateOfBirth("");
    setJerseyNumber("");
    setPosition("");
    setNationality("");
    setCategoryId("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryId) return;

    setIsSubmitting(true);

    try {
      await createPlayer({
        firstName,
        lastName,
        email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@placeholder.com`,
        phoneNumber: phoneNumber || undefined,
        dateOfBirth: dateOfBirth || undefined,
        categoryId: categoryId as any,
        sportType: "basketball",
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
        nationality: nationality || undefined,
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("[CreatePlayerDialog] Failed to create player:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setTimeout(resetForm, 150);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("players.create")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("players.firstName")}</FieldLabel>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder={t("players.firstName")}
                />
              </Field>

              <Field>
                <FieldLabel>{t("players.lastName")}</FieldLabel>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder={t("players.lastName")}
                />
              </Field>
            </div>
          </FieldGroup>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("players.email")}</FieldLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("players.email")}
                />
              </Field>

              <Field>
                <FieldLabel>{t("players.phoneNumber")}</FieldLabel>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={t("players.phoneNumber")}
                />
              </Field>
            </div>
          </FieldGroup>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("players.dateOfBirth")}</FieldLabel>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel>{t("players.nationality")}</FieldLabel>
                <Input
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder={t("players.nationality")}
                />
              </Field>
            </div>
          </FieldGroup>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("players.jerseyNumber")}</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder="#"
                />
              </Field>

              <Field>
                <FieldLabel>{t("players.position")}</FieldLabel>
                <Select
                  value={position}
                  onValueChange={(value: BasketballPosition) =>
                    setPosition(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("players.position")} />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>

          <Field>
            <FieldLabel>{t("players.category")}</FieldLabel>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={t("players.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={isSubmitting || !categoryId}>
              {isSubmitting ? t("actions.loading") : t("actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
