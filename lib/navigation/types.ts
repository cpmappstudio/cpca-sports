import type { ForwardRefExoticComponent, SVGProps } from "react";
import type { AppRole } from "@/convex/lib/auth_types";
import type { RouteSegment } from "@/lib/routes";

export type NavItem = {
  segment: RouteSegment;
  labelKey: string;
  icon: ForwardRefExoticComponent<SVGProps<SVGSVGElement>>;
};

export type NavContext = "admin" | "league" | "club";

export type NavConfig = {
  items: NavItem[];
  showSettings: boolean;
};
