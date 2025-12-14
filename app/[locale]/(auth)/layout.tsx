// ################################################################################
// # Check: 12/13/2025                                                            #
// ################################################################################

import { SlimLayout } from "@/components/layouts/slim-layout";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SlimLayout>{children}</SlimLayout>;
}
