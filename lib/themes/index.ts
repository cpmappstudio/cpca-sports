export const COLOR_SCHEMES = [
    "zinc",
    "nature",
    "northern-lights",
    "claude",
    "soft-pop",
    "modern-minimal",
    "doom64",
    "clean-slate",
    "twitter",
] as const;

export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export const DEFAULT_COLOR_SCHEME: ColorScheme = "zinc";

export interface ColorSchemeConfig {
    name: ColorScheme;
    label: string;
    preview: {
        light: string;
        dark: string;
    };
    /** Optional: custom font family for this theme */
    font?: string;
}

export const COLOR_SCHEME_REGISTRY: Record<ColorScheme, ColorSchemeConfig> = {
    zinc: {
        name: "zinc",
        label: "Zinc",
        preview: {
            light: "oklch(0.205 0 0)",
            dark: "oklch(0.922 0 0)",
        },
    },
    nature: {
        name: "nature",
        label: "Nature",
        preview: {
            light: "oklch(0.5234 0.1347 144.1672)",
            dark: "oklch(0.6731 0.1624 144.2083)",
        },
        font: "var(--font-montserrat), Montserrat, sans-serif",
    },
    "northern-lights": {
        name: "northern-lights",
        label: "Northern Lights",
        preview: {
            light: "oklch(0.6487 0.1538 150.3071)",
            dark: "oklch(0.6487 0.1538 150.3071)",
        },
        font: "var(--font-plus-jakarta-sans), 'Plus Jakarta Sans', sans-serif",
    },
    claude: {
        name: "claude",
        label: "Claude",
        preview: {
            light: "oklch(0.6171 0.1375 39.0427)",
            dark: "oklch(0.6724 0.1308 38.7559)",
        },
        // Uses default Inter font (same as zinc)
    },
    "soft-pop": {
        name: "soft-pop",
        label: "Soft Pop",
        preview: {
            light: "oklch(0.5106 0.2301 276.9656)",
            dark: "oklch(0.6801 0.1583 276.9349)",
        },
        font: "var(--font-dm-sans), 'DM Sans', sans-serif",
    },
    "modern-minimal": {
        name: "modern-minimal",
        label: "Modern Minimal",
        preview: {
            light: "oklch(0.6231 0.1880 259.8145)",
            dark: "oklch(0.6231 0.1880 259.8145)",
        },
        // Uses default Inter font
    },
    doom64: {
        name: "doom64",
        label: "Doom 64",
        preview: {
            light: "oklch(0.5016 0.1887 27.4816)",
            dark: "oklch(0.6083 0.2090 27.0276)",
        },
        font: "var(--font-oxanium), Oxanium, sans-serif",
    },
    "clean-slate": {
        name: "clean-slate",
        label: "Clean Slate",
        preview: {
            light: "oklch(0.5854 0.2041 277.1173)",
            dark: "oklch(0.6801 0.1583 276.9349)",
        },
        // Uses default Inter font
    },
    twitter: {
        name: "twitter",
        label: "Twitter",
        preview: {
            light: "oklch(0.6723 0.1606 244.9955)",
            dark: "oklch(0.6692 0.1607 245.0110)",
        },
        font: "var(--font-open-sans), 'Open Sans', sans-serif",
    },
};
