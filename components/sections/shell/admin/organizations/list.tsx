"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { OrganizationGrid } from "./grid";
import { OrganizationEmptyState } from "./empty-state";
import { LoadMoreButton } from "./load-more-button";

function OrganizationListLoading() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function OrganizationList() {
  const t = useTranslations("Admin.organizations");
  const { isLoaded, userMemberships } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  if (!isLoaded) {
    return <OrganizationListLoading />;
  }

  const organizations = userMemberships.data?.map((m) => m.organization) || [];

  return (
    <div className="flex gap-8 flex-col">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {organizations.length === 0 ? (
        <OrganizationEmptyState />
      ) : (
        <OrganizationGrid organizations={organizations} />
      )}

      <LoadMoreButton
        hasNextPage={userMemberships.hasNextPage ?? false}
        isFetching={userMemberships.isFetching ?? false}
        onLoadMore={() => userMemberships.fetchNext?.()}
      />
    </div>
  );
}
