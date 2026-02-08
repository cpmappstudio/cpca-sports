"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import SettingsItem from "./settings-item";
import { OrganizationProfile } from "@clerk/nextjs";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { MemberInviteForm } from "./member-invite-form";

export function GeneralSettings() {
  const tOrganization = useTranslations("Settings.general.organization");
  const tMembers = useTranslations("Settings.general.members");
  const { isAdmin } = useIsAdmin();
  const params = useParams<{ tenant?: string }>();
  const tenant = typeof params.tenant === "string" ? params.tenant : null;

  const organizationProfileAppearance = {
    elements: {
      rootBox: {
        width: "100%",
      },
      cardBox: {
        display: "block",
        gridTemplateColumns: "unset",
        height: "auto",
        width: "100%",
      },
      header: {
        display: "none !important",
      },
      footer: {
        display: "none !important",
      },
      ...(tenant
        ? {
            membersPageInviteButton: {
              display: "none !important",
            },
          }
        : {}),
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingsItem
        title={tOrganization("title")}
        description={tOrganization("description")}
      >
        <OrganizationProfile appearance={organizationProfileAppearance} />
      </SettingsItem>
      {isAdmin && (
        <SettingsItem
          title={tMembers("title")}
          description={tMembers("description")}
        >
          {tenant && <MemberInviteForm tenant={tenant} />}
          <OrganizationProfile appearance={organizationProfileAppearance}>
            <OrganizationProfile.Page label="members" />
            <OrganizationProfile.Page label="general" />
          </OrganizationProfile>
        </SettingsItem>
      )}
    </div>
  );
}
