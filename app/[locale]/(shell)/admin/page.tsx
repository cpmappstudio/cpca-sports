import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading>Admin Dashboard</Heading>
        <Text className="mt-1">
          Manage organizations and platform settings.
        </Text>
      </div>
    </div>
  );
}
