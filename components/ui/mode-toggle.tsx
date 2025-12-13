"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import * as React from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { MoonIcon, SunMediumIcon } from "lucide-react";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    icon?: React.ReactNode;
    thumbClassName?: string;
  }
>(({ className, icon, thumbClassName, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none flex h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 items-center justify-center",
        thumbClassName,
      )}
    >
      {icon ? icon : null}
    </SwitchPrimitive.Thumb>
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

const ModeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      setIsDarkMode(resolvedTheme === "dark");
    }
  }, [mounted, resolvedTheme]);

  const handleChange = React.useCallback(
    (checked: boolean) => {
      setIsDarkMode(checked);
      setTimeout(() => {
        setTheme(checked ? "dark" : "light");
      }, 150);
    },
    [setTheme],
  );

  if (!mounted) return null;

  return (
    <Switch
      icon={
        isDarkMode ? (
          <MoonIcon className="h-4 w-4" />
        ) : (
          <SunMediumIcon className="h-4 w-4" />
        )
      }
      checked={isDarkMode}
      onCheckedChange={handleChange}
      className="h-7 w-12"
      thumbClassName="h-6 w-6 data-[state=checked]:translate-x-5"
    />
  );
};

export default ModeToggle;
