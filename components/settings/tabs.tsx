"use client";

import { ChevronDownIcon } from "@heroicons/react/16/solid";
import {
  BuildingOfficeIcon,
  CreditCardIcon,
  UserIcon,
  UsersIcon,
} from "@heroicons/react/20/solid";
import clsx from "clsx";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGroup, motion } from "motion/react";

const tabs = [
  { name: "My Account", href: "#", icon: UserIcon, current: false },
  { name: "Company", href: "#", icon: BuildingOfficeIcon, current: false },
  { name: "Team Members", href: "#", icon: UsersIcon, current: true },
  { name: "Billing", href: "#", icon: CreditCardIcon, current: false },
];

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Tabs() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState("");

  // Initialize on client-side only to avoid hydration mismatch
  useEffect(() => {
    const current = tabs.find((tab) => tab.current);
    if (current) {
      setSelectedTab(current.name);
    }
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tabName = e.target.value;
    setSelectedTab(tabName);
    const tab = tabs.find((t) => t.name === tabName);
    if (tab?.href) {
      router.push(tab.href);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:hidden">
        {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
        <select
          value={selectedTab}
          onChange={handleSelectChange}
          aria-label="Select Link tab"
          suppressHydrationWarning
          className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-gray-100 dark:outline-white/10 dark:*:bg-gray-800 dark:focus:outline-indigo-500"
        >
          {tabs.map((tab) => (
            <option key={tab.name} value={tab.name}>
              {tab.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end "
        />
      </div>
      <div className="hidden sm:block">
        <div className="border-b mb-10 border-gray-200 dark:border-white/10">
          <LayoutGroup>
            <nav aria-label="Tabs" className="-mb-px flex space-x-8 ">
              {tabs.map((tab) => (
                <span key={tab.name} className="relative">
                  {tab.current && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute -bottom-px  left-0 right-0 h-0.5 rounded-full bg-zinc-950 dark:bg-white"
                    />
                  )}
                  <Link
                    href={tab.href}
                    aria-current={tab.current ? "page" : undefined}
                    className={clsx(
                      // Base
                      "group hover:bg-zinc-950/5 dark:hover:bg-white/5 rounded-md inline-flex items-center gap-2 px-1 py-2 mb-6 text-sm font-medium",
                      // Colors
                      "text-zinc-950 dark:text-white",
                      // Icon
                      "*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0",
                      // Current state
                      tab.current
                        ? "*:data-[slot=icon]:fill-zinc-950 dark:*:data-[slot=icon]:fill-white"
                        : "*:data-[slot=icon]:fill-zinc-500 dark:*:data-[slot=icon]:fill-zinc-400",
                      // Hover
                      !tab.current &&
                        " hover:*:data-[slot=icon]:fill-zinc-950 dark:hover:*:data-[slot=icon]:fill-white",
                    )}
                  >
                    <tab.icon data-slot="icon" aria-hidden="true" />
                    <span>{tab.name}</span>
                  </Link>
                </span>
              ))}
            </nav>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}
