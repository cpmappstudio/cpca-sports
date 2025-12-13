"use client";

import { useParams } from "next/navigation";
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

export default function OrgSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgSlug = params.organization as string;
  const t = useTranslations("Settings.nav");

  const basePath = ROUTES.org.settings.root(orgSlug);

  const navItems: SettingsNavItem[] = [
    {
      label: t("general"),
      href: basePath,
      icon: Cog6ToothIcon,
    },
    {
      label: t("appearance"),
      href: ROUTES.org.settings.appearance(orgSlug),
      icon: Palette,
    },
    {
      label: t("notifications"),
      href: ROUTES.org.settings.notifications(orgSlug),
      icon: BellIcon,
    },
    {
      label: t("security"),
      href: ROUTES.org.settings.security(orgSlug),
      icon: ShieldCheckIcon,
    },
    {
      label: t("billing"),
      href: ROUTES.org.settings.billing(orgSlug),
      icon: CreditCardIcon,
    },
  ];

  return (
    <SettingsLayout navItems={navItems} basePath={basePath}>
      {children}
    </SettingsLayout>
  );
}
