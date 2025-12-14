// ################################################################################
// # Check: 12/14/2025                                                            #
// ################################################################################
// TODO: Dashboards may be implemented, or this component would be replaced by organizations.

import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/navigation/routes";

export default function AdminPage() {
  redirect(ROUTES.admin.organizations.list);
}
