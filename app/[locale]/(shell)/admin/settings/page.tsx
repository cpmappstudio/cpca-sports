import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/navigation/routes";

export default function AdminSettingsPage() {
  redirect(ROUTES.admin.settings.appearance);
}
