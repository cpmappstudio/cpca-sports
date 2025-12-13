import {
    Cog6ToothIcon,
    BellIcon,
    ShieldCheckIcon,
    CreditCardIcon,
} from "@heroicons/react/24/outline";
import { Palette } from "lucide-react";

export type SettingsIconName = "general" | "appearance" | "notifications" | "security" | "billing";

export const SETTINGS_ICON_MAP: Record<SettingsIconName, React.ComponentType<{ className?: string }>> = {
    general: Cog6ToothIcon,
    appearance: Palette,
    notifications: BellIcon,
    security: ShieldCheckIcon,
    billing: CreditCardIcon,
};
