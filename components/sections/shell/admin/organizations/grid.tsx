import { OrganizationCard } from "./card";
import { CreateOrganizationCard } from "./create-card";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
}

interface OrganizationGridProps {
  organizations: Organization[];
}

export function OrganizationGrid({ organizations }: OrganizationGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <CreateOrganizationCard />
      {organizations.map((org) => (
        <OrganizationCard
          key={org.id}
          name={org.name}
          slug={org.slug || org.id}
          imageUrl={org.imageUrl}
        />
      ))}
    </div>
  );
}
