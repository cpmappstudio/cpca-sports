"use client";

import { useTranslations } from "next-intl";
import { UserProfile } from "@clerk/nextjs";
import SettingsItem from "./settings-item";

const coachRestrictedElements = {
  profileSectionPrimaryButton__profile: "hidden",
  profileSectionPrimaryButton__username: "hidden",
  profileSectionPrimaryButton__emailAddresses: "hidden",
  profileSectionPrimaryButton__phoneNumbers: "hidden",
  profileSectionPrimaryButton__connectedAccounts: "hidden",
  profileSectionPrimaryButton__enterpriseAccounts: "hidden",
  profileSectionPrimaryButton__web3Wallets: "hidden",
  menuButton__emailAddresses: "hidden",
  menuButton__phoneNumbers: "hidden",
  menuButton__connectedAccounts: "hidden",
  menuButton__enterpriseAccounts: "hidden",
  menuButton__web3Wallets: "hidden",
  profileSection__passkeys: "hidden",
  profileSection__mfa: "hidden",
  profileSection__activeDevices: "hidden",
  profileSection__danger: "hidden",
} as const;

export function SecuritySettings({
  coachRestricted = false,
}: {
  coachRestricted?: boolean;
}) {
  const tProfile = useTranslations("Settings.profile");
  const tSecurity = useTranslations("Settings.security");
  const appearance = {
    elements: {
      rootBox: "w-full",
      cardBox: "w-full",
      ...(coachRestricted ? coachRestrictedElements : {}),
    },
  } as const;

  return (
    <div className="flex flex-col gap-4">
      <SettingsItem
        title={tProfile("title")}
        description={tProfile("description")}
      >
        <UserProfile appearance={appearance} />
      </SettingsItem>
      <SettingsItem
        title={tSecurity("title")}
        description={tSecurity("description")}
      >
        <UserProfile appearance={appearance}>
          <UserProfile.Page label="security" />
          <UserProfile.Page label="account" />
        </UserProfile>
      </SettingsItem>
    </div>
  );
}
