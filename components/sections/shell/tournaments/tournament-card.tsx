"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

interface TournamentCardProps {
  tournament: {
    _id: Id<"tournaments">;
    name: string;
    slug: string;
    description?: string;
    ageGroups: string[];
    conferences: string[];
    gender: "male" | "female" | "mixed";
    registrationDeadline?: string;
    status: "draft" | "upcoming" | "ongoing" | "completed" | "cancelled";
  };
  onPreRegister?: (tournamentId: Id<"tournaments">) => void;
  className?: string;
}

export function TournamentCard({
  tournament,
  onPreRegister,
  className,
}: TournamentCardProps) {
  const t = useTranslations("Common");

  const formattedDeadline = tournament.registrationDeadline
    ? new Date(tournament.registrationDeadline).toLocaleDateString()
    : null;

  const isRegistrationOpen =
    tournament.status === "draft" || tournament.status === "upcoming";

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{tournament.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {t(`gender.${tournament.gender}`)}
          </Badge>
        </div>
        {tournament.description && (
          <CardDescription className="line-clamp-2">
            {tournament.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <UsersIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {tournament.ageGroups.length > 2
                ? `${tournament.ageGroups.slice(0, 2).join(", ")}...`
                : tournament.ageGroups.join(", ")}
            </span>
          </div>

          {formattedDeadline && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-4 w-4 shrink-0" />
              <span>
                {t("tournaments.registrationDeadline")}: {formattedDeadline}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPinIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {tournament.conferences.length > 2
                ? `${tournament.conferences.slice(0, 2).join(", ")}...`
                : tournament.conferences.join(", ")}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={() => onPreRegister?.(tournament._id)}
          disabled={!isRegistrationOpen}
        >
          {t("tournaments.preRegister")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function TournamentCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="animate-pulse">
        <div className="flex items-start justify-between gap-2">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 animate-pulse">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 w-28 bg-muted rounded" />
          </div>
        </div>
      </CardContent>

      <CardFooter className="animate-pulse">
        <div className="h-10 w-full bg-muted rounded" />
      </CardFooter>
    </Card>
  );
}
