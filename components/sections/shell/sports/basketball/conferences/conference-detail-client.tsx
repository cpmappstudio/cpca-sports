"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConferenceDetailClientProps {
  preloadedConference: Preloaded<typeof api.conferences.getBySlug>;
  orgSlug: string;
}

export function ConferenceDetailClient({
  preloadedConference,
  orgSlug,
}: ConferenceDetailClientProps) {
  const t = useTranslations("Common");
  const conference = usePreloadedQuery(preloadedConference);

  if (conference === null) {
    return (
      <div className="p-4 md:p-6">
        <Heading>{t("errors.notFound")}</Heading>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Heading>{conference.name}</Heading>
          {conference.shortName && (
            <Badge variant="secondary" className="text-sm">
              {conference.shortName}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {conference.region && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t("conferences.region")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-2xl font-bold">{conference.region}</Text>
            </CardContent>
          </Card>
        )}

        {conference.divisions && conference.divisions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t("conferences.divisions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {conference.divisions.map((division) => (
                  <Badge key={division} variant="secondary">
                    {division}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("conferences.teams")}</CardTitle>
          <CardDescription>
            Teams in this conference will be displayed here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Text className="text-muted-foreground">
            Teams list coming soon...
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
