/**
 * Settings Search Configuration
 *
 * This file defines all searchable settings items.
 * Each item maps to a specific settings page/section and includes
 * translation keys for localized search + optional extra keywords.
 */

import type { SettingsIconName } from "./icons";

export type SettingsSearchItem = {
    /** Relative path from settings base (e.g., "appearance", "security") */
    path: string;
    /** Section within the page (e.g., "theme", "language") - used for anchoring */
    section: string;
    /** Translation namespace for title/description (e.g., "appearance.theme") */
    translationKey: string;
    /** Icon component name from the nav items */
    iconName: SettingsIconName;
    /** Additional keywords for search (language-agnostic synonyms) */
    extraKeywords?: string[];
};

export const SETTINGS_SEARCH_ITEMS: SettingsSearchItem[] = [
    // Appearance page items
    {
        path: "appearance",
        section: "theme",
        translationKey: "appearance.theme",
        iconName: "appearance",
        extraKeywords: ["dark", "light", "mode", "oscuro", "claro", "modo", "night", "day", "noche", "día"],
    },
    {
        path: "appearance",
        section: "colorScheme",
        translationKey: "appearance.colorScheme",
        iconName: "appearance",
        extraKeywords: ["color", "palette", "scheme", "paleta", "colores", "theme", "tema", "zinc", "nature", "claude"],
    },
    {
        path: "appearance",
        section: "language",
        translationKey: "appearance.language",
        iconName: "appearance",
        extraKeywords: ["language", "idioma", "locale", "español", "english", "es", "en", "translation", "traducción"],
    },
    // General page items (placeholder - expand as needed)
    {
        path: "",
        section: "appearance",
        translationKey: "general.appearance",
        iconName: "general",
        extraKeywords: ["look", "visual", "aspecto"],
    },
    {
        path: "",
        section: "language",
        translationKey: "general.language",
        iconName: "general",
        extraKeywords: ["language", "idioma", "locale"],
    },
    // Notifications (placeholder)
    {
        path: "notifications",
        section: "notifications",
        translationKey: "notifications",
        iconName: "notifications",
        extraKeywords: ["alerts", "alertas", "email", "push", "notify", "notificar"],
    },
    // Security (placeholder)
    {
        path: "security",
        section: "security",
        translationKey: "security",
        iconName: "security",
        extraKeywords: ["password", "contraseña", "2fa", "auth", "authentication", "autenticación", "login"],
    },
    // Billing (placeholder)
    {
        path: "billing",
        section: "billing",
        translationKey: "billing",
        iconName: "billing",
        extraKeywords: ["payment", "pago", "plan", "subscription", "suscripción", "invoice", "factura", "card", "tarjeta"],
    },
];
