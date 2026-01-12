import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
}>;

export default async function TeamSettingsPage({
  params,
}: {
  params: Params;
}) {
  const { team } = await params;

  return (
    <div className="space-y-6 p-6">
      <div>
        <Heading>Settings</Heading>
        <Text className="mt-1">Manage settings for {team}</Text>
      </div>
    </div>
  );
}
