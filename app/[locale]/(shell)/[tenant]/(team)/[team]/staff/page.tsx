import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
}>;

export default async function TeamStaffPage({ params }: { params: Params }) {
  const { team } = await params;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <Heading>Staff</Heading>
        <Text className="mt-1">Manage staff for {team}</Text>
      </div>
    </div>
  );
}
