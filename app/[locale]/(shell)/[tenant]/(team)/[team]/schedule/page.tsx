import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
}>;

export default async function TeamSchedulePage({
  params,
}: {
  params: Params;
}) {
  const { team } = await params;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <Heading>Schedule</Heading>
        <Text className="mt-1">
          View and manage the schedule for {team}
        </Text>
      </div>
    </div>
  );
}
