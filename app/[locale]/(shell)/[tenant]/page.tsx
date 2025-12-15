import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

type Params = Promise<{
  locale: string;
  tenant: string;
}>;

export default async function OrganizationDashboardPage({
  params,
}: {
  params: Params;
}) {
  const { tenant } = await params;

  return (
    <div className="space-y-6">
      <div>
        <Heading>Dashboard</Heading>
        <Text className="mt-1">Overview for {tenant}</Text>
      </div>
    </div>
  );
}
