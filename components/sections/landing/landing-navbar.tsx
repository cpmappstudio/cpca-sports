// ################################################################################
// # Check: 12/13/2025                                                            #
// ################################################################################
// TODO:
// - [x] Place real hrefs
// - [x] Centralize the Logo
// - [ ] Centralize navItems
// - [ ] Use Next-intl

import Link from "next/link";
import { ROUTES } from "@/lib/navigation/routes";

import {
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  Navbar,
  NavbarDivider,
  NavbarSection,
  NavbarItem,
  NavbarSpacer,
} from "@/components/ui/navbar";

const navItems = [
  { label: "Features", url: "#features" },
  { label: "Testimonials", url: "#testimonials" },
  { label: "Pricing", url: "#pricing" },
];

export function SidebarLandingNavbar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="#" aria-label="Home">
          <Logo className="h-10 w-auto" />
        </Link>
      </SidebarHeader>
      <SidebarBody>
        <SidebarSection>
          {navItems.map(({ label, url }) => (
            <SidebarItem key={label} href={url}>
              {label}
            </SidebarItem>
          ))}
        </SidebarSection>
        <SidebarSection>
          <SidebarItem href={ROUTES.auth.signIn} aria-label="sign-in">
            Sign in
          </SidebarItem>
          <Button color="blue">
            Get started <span className="hidden lg:inline">today</span>
          </Button>
        </SidebarSection>
      </SidebarBody>
    </Sidebar>
  );
}

export function NavbarLandingNavbar() {
  return (
    <Navbar className="flex flex-row-reverse lg:flex-row">
      <Link href="/" aria-label="Home">
        <Logo className="h-10 w-auto" />
      </Link>
      <NavbarDivider className="max-lg:hidden" />
      <NavbarSection className="max-lg:hidden">
        {navItems.map(({ label, url }) => (
          <NavbarItem key={label} href={url}>
            {label}
          </NavbarItem>
        ))}
      </NavbarSection>
      <NavbarSpacer />
      <NavbarSection className="hidden lg:flex flex-row">
        <NavbarItem href={ROUTES.auth.signIn} aria-label="sign-in">
          Sign in
        </NavbarItem>
        <Button color="blue">
          Get started <span className="hidden lg:inline">today</span>
        </Button>
      </NavbarSection>
    </Navbar>
  );
}
