"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TournamentCard, TournamentCardSkeleton } from "./tournament-card";
import { Text } from "@/components/ui/text";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { ListFilter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TournamentsGridProps {
  clubSlug: string;
  onPreRegister?: (tournamentId: Id<"tournaments">) => void;
}

type Gender = "male" | "female" | "mixed";
type Status = "draft" | "upcoming" | "ongoing" | "completed" | "cancelled";

interface Filters {
  gender: Gender[];
  status: Status[];
}

export function TournamentsGrid({
  clubSlug,
  onPreRegister,
}: TournamentsGridProps) {
  const t = useTranslations("Common");
  const data = useQuery(api.tournaments.listAvailableForClub, {
    clubSlug,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    gender: [],
    status: [],
  });

  const genderOptions = [
    { value: "male" as Gender, label: t("gender.male") },
    { value: "female" as Gender, label: t("gender.female") },
    { value: "mixed" as Gender, label: t("gender.mixed") },
  ];

  const statusOptions = [
    { value: "draft" as Status, label: t("tournamentStatus.draft") },
    { value: "upcoming" as Status, label: t("tournamentStatus.upcoming") },
  ];

  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((tournament) => {
      const matchesSearch =
        searchQuery === "" ||
        tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.ageGroups.some((ag) =>
          ag.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesGender =
        filters.gender.length === 0 ||
        filters.gender.includes(tournament.gender);

      const matchesStatus =
        filters.status.length === 0 ||
        filters.status.includes(tournament.status);

      return matchesSearch && matchesGender && matchesStatus;
    });
  }, [data, searchQuery, filters]);

  const toggleFilter = <K extends keyof Filters>(
    key: K,
    value: Filters[K][number],
  ) => {
    setFilters((prev) => {
      const current = prev[key] as Filters[K][number][];
      const isSelected = current.includes(value);
      return {
        ...prev,
        [key]: isSelected
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({ gender: [], status: [] });
  };

  const hasActiveFilters =
    filters.gender.length > 0 || filters.status.length > 0;

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-64 bg-muted rounded animate-pulse" />
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
        </div>
        <TournamentsGridSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <InputGroup>
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t("tournaments.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </InputGroup>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "cursor-pointer relative",
                hasActiveFilters && "border-2 border-primary",
              )}
            >
              <ListFilter className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>{t("table.filters")}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center justify-between">
                <span>{t("tournaments.gender")}</span>
                {filters.gender.length > 0 && (
                  <Badge color="zinc" className="ml-2 h-5 px-1.5">
                    {filters.gender.length}
                  </Badge>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[200px]">
                {genderOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.gender.includes(option.value)}
                    onCheckedChange={() => toggleFilter("gender", option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center justify-between">
                <span>{t("tournaments.status")}</span>
                {filters.status.length > 0 && (
                  <Badge color="zinc" className="ml-2 h-5 px-1.5">
                    {filters.status.length}
                  </Badge>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[200px]">
                {statusOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.status.includes(option.value)}
                    onCheckedChange={() => toggleFilter("status", option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm font-normal"
                  onClick={clearAllFilters}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t("actions.clear")}
                </Button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Text className="text-muted-foreground">
            {t("tournaments.emptyMessage")}
          </Text>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredData.map((tournament) => (
            <TournamentCard
              key={tournament._id}
              tournament={tournament}
              onPreRegister={onPreRegister}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TournamentsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <TournamentCardSkeleton key={i} />
      ))}
    </div>
  );
}
