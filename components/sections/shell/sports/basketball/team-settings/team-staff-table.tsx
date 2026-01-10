"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/table/data-table";
import {
  createSearchColumn,
  createSortableHeader,
} from "@/components/table/column-helpers";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type StaffRole = "delegate" | "head_coach" | "assistant_coach" | "trainer" | "manager";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  avatarUrl?: string;
  phoneNumber?: string;
}

interface TeamStaffTableProps {
  clubSlug: string;
  orgSlug: string;
}

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "delegate", label: "Delegate" },
  { value: "head_coach", label: "Head Coach" },
  { value: "assistant_coach", label: "Assistant Coach" },
  { value: "trainer", label: "Trainer" },
  { value: "manager", label: "Manager" },
];

const ROLE_STYLES: Record<StaffRole, string> = {
  delegate: "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
  head_coach: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  assistant_coach: "text-cyan-700 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950",
  trainer: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950",
  manager: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
};

export function TeamStaffTable({ clubSlug, orgSlug }: TeamStaffTableProps) {
  const t = useTranslations("Common");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  // For now, using placeholder data since staff queries may not exist yet
  const staffMembers: StaffMember[] = [];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhoneNumber("");
    setRole("");
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement staff creation mutation
      console.log("[TeamStaffTable] Creating staff member:", {
        firstName,
        lastName,
        email,
        phoneNumber,
        role,
        clubSlug,
      });

      resetForm();
      setIsCreateOpen(false);
    } catch (error) {
      console.error("[TeamStaffTable] Failed to create staff member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;

    try {
      // TODO: Implement staff deletion mutation
      console.log("[TeamStaffTable] Deleting staff member:", staffToDelete.id);
      setStaffToDelete(null);
    } catch (error) {
      console.error("[TeamStaffTable] Failed to delete staff member:", error);
    }
  };

  const columns: ColumnDef<StaffMember>[] = [
    createSearchColumn<StaffMember>(["name", "email", "role"]),

    {
      accessorKey: "name",
      header: createSortableHeader(t("staff.name")),
      cell: ({ row }) => {
        const initials = row.original.name.slice(0, 2).toUpperCase();
        const avatarUrl = row.original.avatarUrl;

        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={avatarUrl}
              initials={avatarUrl ? undefined : initials}
              alt={row.original.name}
              className="size-10"
            />
            <div>
              <span className="font-medium">{row.original.name}</span>
            </div>
          </div>
        );
      },
    },

    {
      accessorKey: "email",
      header: createSortableHeader(t("staff.email")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },

    {
      accessorKey: "phoneNumber",
      header: createSortableHeader(t("staff.phoneNumber")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.phoneNumber || "—"}
        </span>
      ),
    },

    {
      accessorKey: "role",
      header: createSortableHeader(t("staff.role")),
      cell: ({ row }) => {
        const role = row.original.role;
        const className = ROLE_STYLES[role];
        const label = ROLE_OPTIONS.find((r) => r.value === role)?.label || role;

        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
          >
            {label}
          </span>
        );
      },
    },

    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pencil className="size-4 mr-2" />
                {t("actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setStaffToDelete(row.original)}
              >
                <Trash2 className="size-4 mr-2" />
                {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      {staffMembers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("staff.title")}</CardTitle>
            <CardDescription>{t("staff.emptyDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreateOpen(true)}>
              {t("staff.addFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={staffMembers}
          filterColumn="search"
          filterPlaceholder={t("staff.searchPlaceholder")}
          emptyMessage={t("staff.emptyMessage")}
          onCreate={() => setIsCreateOpen(true)}
        />
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("staff.create")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-6 mt-4">
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>{t("staff.firstName")}</FieldLabel>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder={t("staff.firstName")}
                  />
                </Field>

                <Field>
                  <FieldLabel>{t("staff.lastName")}</FieldLabel>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder={t("staff.lastName")}
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>{t("staff.email")}</FieldLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t("staff.email")}
                  />
                </Field>

                <Field>
                  <FieldLabel>{t("staff.phoneNumber")}</FieldLabel>
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={t("staff.phoneNumber")}
                  />
                </Field>
              </div>
            </FieldGroup>

            <Field>
              <FieldLabel>{t("staff.role")}</FieldLabel>
              <Select
                value={role}
                onValueChange={(value: StaffRole) => setRole(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("staff.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || !role}>
                {isSubmitting ? t("actions.loading") : t("actions.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
