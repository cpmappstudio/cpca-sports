"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { FieldLabel } from "@/components/ui/field";
import { MoreHorizontal, Trash2 } from "lucide-react";

type StaffRole = "delegate" | "technical_director" | "assistant_coach";

const ROLE_OPTIONS: { value: StaffRole; labelKey: string }[] = [
  { value: "delegate", labelKey: "staffRole.delegate" },
  { value: "technical_director", labelKey: "staffRole.technical_director" },
  { value: "assistant_coach", labelKey: "staffRole.assistant_coach" },
];

interface StaffRow {
  _id: string;
  profileId: Id<"profiles">;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  categoryName?: string;
}

interface TeamStaffTableProps {
  clubSlug: string;
  orgSlug: string;
}

const ROLE_STYLES: Record<StaffRole, string> = {
  delegate:
    "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
  technical_director:
    "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  assistant_coach:
    "text-cyan-700 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950",
};

export function TeamStaffTable({ clubSlug, orgSlug }: TeamStaffTableProps) {
  const t = useTranslations("Common");
  const staffData = useQuery(api.staff.listAllByClubSlug, { clubSlug });
  const addDelegate = useMutation(api.staff.addDelegate);
  const removeDelegate = useMutation(api.staff.removeDelegate);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("delegate");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const staffMembers = staffData?.staff ?? [];

  const resetForm = () => {
    setEmail("");
    setRole("delegate");
  };

  const handleCreateSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);

    try {
      if (role === "delegate") {
        await addDelegate({
          clubSlug,
          email: email.trim(),
        });
      }
      // TODO: Handle technical_director and assistant_coach roles
      // These require a categoryId, so we'd need a category selector

      resetForm();
      setIsCreateOpen(false);
    } catch (error) {
      console.error("[TeamStaffTable] Failed to add delegate:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;

    setIsDeleting(true);
    try {
      if (staffToDelete.role === "delegate") {
        await removeDelegate({
          clubSlug,
          profileId: staffToDelete.profileId,
        });
      }
      setStaffToDelete(null);
    } catch (error) {
      console.error("[TeamStaffTable] Failed to delete staff member:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<StaffRow>[] = [
    createSearchColumn<StaffRow>(["fullName", "email", "role"]),

    {
      accessorKey: "fullName",
      header: createSortableHeader(t("staff.name")),
      cell: ({ row }) => {
        const initials = row.original.fullName.slice(0, 2).toUpperCase();
        const avatarUrl = row.original.avatarUrl;

        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={avatarUrl}
              initials={avatarUrl ? undefined : initials}
              alt={row.original.fullName}
              className="size-10"
            />
            <div>
              <span className="font-medium">{row.original.fullName}</span>
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
      accessorKey: "role",
      header: createSortableHeader(t("staff.role")),
      cell: ({ row }) => {
        const role = row.original.role as StaffRole;
        const className = ROLE_STYLES[role] || ROLE_STYLES.delegate;

        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
          >
            {t(`staffRole.${role}`)}
          </span>
        );
      },
    },

    {
      id: "actions",
      cell: ({ row }) => {
        const isDelegate = row.original.role === "delegate";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isDelegate && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setStaffToDelete(row.original)}
                >
                  <Trash2 className="size-4 mr-2" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={staffMembers}
        filterColumn="search"
        filterPlaceholder={t("staff.searchPlaceholder")}
        emptyMessage={t("staff.emptyMessage")}
        onCreate={() => setIsCreateOpen(true)}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("staff.create")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-6 mt-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <FieldLabel>{t("form.email")}</FieldLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <FieldLabel className="invisible">Role</FieldLabel>

                <Select
                  value={role}
                  onValueChange={(value: StaffRole) => setRole(value)}
                >
                  <SelectTrigger className="w-[140px] mt-2">
                    <SelectValue placeholder={t("staff.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? t("actions.loading") : t("actions.add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!staffToDelete}
        onOpenChange={() => setStaffToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("players.deleteDescription", {
                name: staffToDelete?.fullName ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("actions.loading") : t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
