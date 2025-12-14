// ################################################################################
// # Check: 12/14/2025                                                            #
// ################################################################################
// TODO: SettingsLayout needs to be refactored to follow the same pattern as the other layouts.

import { SettingsLayout } from "@/components/layouts/settings-layout";

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsLayout context="admin">{children}</SettingsLayout>;
}
