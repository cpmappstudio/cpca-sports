// ################################################################################
// # Check: 01/14/2025                                                            #
// ################################################################################

import { clerkClient } from "@clerk/nextjs/server";
import { OrganizationList } from "@/components/sections/shell/admin/organizations";

import { adminOrganizationsMetadata } from "@/lib/seo/admin";
export const metadata = adminOrganizationsMetadata;

export default async function OrganizationsPage() {
  const { data: organizations } = await (
    await clerkClient()
  ).organizations.getOrganizationList({ orderBy: "-created_at" });

  return <OrganizationList organizations={organizations} />;
}
