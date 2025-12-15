// ################################################################################
// # Check: 01/14/2025                                                            #
// ################################################################################

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { protocol, rootDomain } from "@/lib/utils";

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
    <Card className="p-3">
      <CardHeader className="px-1">
        <div className="flex items-center justify-between">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={name}
              width={0}
              height={0}
              className="size-8 rounded-full object-cover"
            />
          )}
          <div className="text-xs text-muted-foreground">
            {slug}.{rootDomain}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-1">
        <CardTitle>{name}</CardTitle>
        <div className="mt-4">
          <a
            href={`${protocol}://${slug}.${rootDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            Visit subdomain →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
