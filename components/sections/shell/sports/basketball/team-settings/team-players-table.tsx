"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { CreatePlayerDialog } from "./create-player-dialog";

interface PlayerRow {
  _id: string;
  profileId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  status: "active" | "injured" | "on_loan" | "inactive";
  height?: number | null;
  weight?: number | null;
  nationality?: string | null;
}

interface TeamPlayersTableProps {
  players: PlayerRow[];
  clubSlug: string;
  orgSlug: string;
}

const STATUS_STYLES: Record<PlayerRow["status"], string> = {
  active: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950",
  injured: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950",
  on_loan: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
  inactive: "text-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-950",
};

const POSITION_LABELS: Record<string, string> = {
  point_guard: "PG",
  shooting_guard: "SG",
  small_forward: "SF",
  power_forward: "PF",
  center: "C",
};

export function TeamPlayersTable({
  players,
  clubSlug,
  orgSlug,
}: TeamPlayersTableProps) {
  const t = useTranslations("Common");
  const deletePlayer = useMutation(api.players.deletePlayer);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<PlayerRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!playerToDelete) return;

    setIsDeleting(true);
    try {
      await deletePlayer({
        playerId: playerToDelete._id as Id<"players">,
      });
      setPlayerToDelete(null);
    } catch (error) {
      console.error("[TeamPlayersTable] Failed to delete player:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<PlayerRow>[] = [
    createSearchColumn<PlayerRow>(["fullName", "position", "nationality"]),

    {
      accessorKey: "fullName",
      header: createSortableHeader(t("players.name")),
      cell: ({ row }) => {
        const initials = row.original.fullName.slice(0, 2).toUpperCase();
        const avatarUrl = row.original.avatarUrl;

        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={avatarUrl || undefined}
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
      accessorKey: "jerseyNumber",
      header: createSortableHeader("#"),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.jerseyNumber ?? "—"}
        </span>
      ),
    },

    {
      accessorKey: "position",
      header: createSortableHeader(t("players.position")),
      cell: ({ row }) => {
        const position = row.original.position;
        const label = position ? POSITION_LABELS[position] || position : "—";
        return <span className="text-sm text-muted-foreground">{label}</span>;
      },
    },

    {
      accessorKey: "height",
      header: createSortableHeader(t("players.height")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.height ? `${row.original.height} cm` : "—"}
        </span>
      ),
    },

    {
      accessorKey: "nationality",
      header: createSortableHeader(t("players.nationality")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.nationality || "—"}
        </span>
      ),
    },

    {
      accessorKey: "status",
      header: createSortableHeader(t("players.status")),
      cell: ({ row }) => {
        const status = row.original.status;
        const className = STATUS_STYLES[status];

        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
          >
            {t(`players.statusOptions.${status}`)}
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
                onClick={() => setPlayerToDelete(row.original)}
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
      <DataTable
        columns={columns}
        data={players}
        filterColumn="search"
        filterPlaceholder={t("players.searchPlaceholder")}
        emptyMessage={t("players.emptyMessage")}
        onCreate={() => setIsCreateOpen(true)}
      />

      <CreatePlayerDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        clubSlug={clubSlug}
      />

      <AlertDialog
        open={!!playerToDelete}
        onOpenChange={() => setPlayerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("players.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("players.deleteDescription", {
                name: playerToDelete?.fullName ?? "",
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
