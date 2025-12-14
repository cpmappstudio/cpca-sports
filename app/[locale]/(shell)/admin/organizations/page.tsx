// ################################################################################
// # Check: 01/13/2025                                                            #
// ################################################################################

import { adminOrganizationsMetadata } from "@/lib/seo/admin";
import { OrganizationList } from "@/components/sections/shell/admin/organizations";

export const metadata = adminOrganizationsMetadata;

export default function OrganizationsPage() {
  return <OrganizationList />;
}
