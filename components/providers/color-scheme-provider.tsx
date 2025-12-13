"use client";

import * as React from "react";
import {
    ColorScheme,
    COLOR_SCHEMES,
    DEFAULT_COLOR_SCHEME,
} from "@/lib/themes";

const STORAGE_KEY = "color-scheme";

interface ColorSchemeContextValue {
    colorScheme: ColorScheme;
    setColorScheme: (scheme: ColorScheme) => void;
}

const ColorSchemeContext = React.createContext<ColorSchemeContextValue | null>(
    null
);

export function useColorScheme() {
    const context = React.useContext(ColorSchemeContext);
    if (!context) {
        throw new Error(
            "useColorScheme must be used within a ColorSchemeProvider"
        );
    }
    return context;
}

interface ColorSchemeProviderProps {
    children: React.ReactNode;
    defaultScheme?: ColorScheme;
}

export function ColorSchemeProvider({
    children,
    defaultScheme = DEFAULT_COLOR_SCHEME,
}: ColorSchemeProviderProps) {
    const [colorScheme, setColorSchemeState] =
        React.useState<ColorScheme>(defaultScheme);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
        if (stored && COLOR_SCHEMES.includes(stored)) {
            setColorSchemeState(stored);
            document.documentElement.setAttribute("data-theme", stored);
        } else {
            document.documentElement.setAttribute("data-theme", defaultScheme);
        }
        setMounted(true);
    }, [defaultScheme]);

    const setColorScheme = React.useCallback((scheme: ColorScheme) => {
        setColorSchemeState(scheme);
        localStorage.setItem(STORAGE_KEY, scheme);
        document.documentElement.setAttribute("data-theme", scheme);
    }, []);

    const value = React.useMemo(
        () => ({ colorScheme, setColorScheme }),
        [colorScheme, setColorScheme]
    );

    if (!mounted) {
        return null;
    }

    return (
        <ColorSchemeContext.Provider value={value}>
            {children}
        </ColorSchemeContext.Provider>
    );
}
