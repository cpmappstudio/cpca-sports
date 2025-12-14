"use client";

import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { rootDomain } from "@/lib/utils";
import { goToOrganizationAction } from "@/lib/tenant";

interface OrganizationCardProps {
  name: string;
  slug: string;
  imageUrl?: string;
}

export function OrganizationCard({
  name,
  slug,
  imageUrl,
}: OrganizationCardProps) {
  return (
    <form action={goToOrganizationAction} className="h-full">
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" className="w-full h-full text-left">
        <Card className="group h-full hover:border-primary/50 p-0 transition-colors cursor-pointer overflow-hidden">
          {/* Header with subdomain */}
          <div className="flex items-center justify-between p-4 border-b group-hover:border-primary/50 transition-colors">
            <OrganizationAvatar name={name} imageUrl={imageUrl} />
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
              {slug}.{rootDomain}
            </span>
          </div>

          {/* Content */}
          <div className="p-4 space-y-1">
            <h3 className="font-semibold truncate">{name}</h3>
          </div>
        </Card>
      </button>
    </form>
  );
}

function OrganizationAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="size-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="size-8 rounded-full bg-muted flex items-center justify-center">
      <Building2 className="size-4 text-muted-foreground" />
    </div>
  );
}
