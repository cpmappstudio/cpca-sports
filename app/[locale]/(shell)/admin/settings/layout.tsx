"use client";

import { useTranslations } from "next-intl";
import {
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import { Palette } from "lucide-react";
import {
  SettingsLayout,
  type SettingsNavItem,
} from "@/components/layouts/settings-layout";
import { ROUTES } from "@/lib/routes";

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("Settings.nav");

  const basePath = ROUTES.admin.settings.root;

  const navItems: SettingsNavItem[] = [
    {
      label: t("general"),
      href: basePath,
      icon: Cog6ToothIcon,
    },
    {
      label: t("appearance"),
      href: ROUTES.admin.settings.appearance,
      icon: Palette,
    },
    {
      label: t("notifications"),
      href: ROUTES.admin.settings.notifications,
      icon: BellIcon,
    },
    {
      label: t("security"),
      href: ROUTES.admin.settings.security,
      icon: ShieldCheckIcon,
    },
    {
      label: t("billing"),
      href: ROUTES.admin.settings.billing,
      icon: CreditCardIcon,
    },
  ];

  return (
    <SettingsLayout navItems={navItems} basePath={basePath}>
      {children}
    </SettingsLayout>
  );
}
