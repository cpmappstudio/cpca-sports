import { AuthLayout } from "@/components/ui/auth-layout";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}
