import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function EntityDetailBackButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Button asChild variant="outline" size="sm" className="w-fit bg-background">
      <Link href={href}>
        <ArrowLeft className="size-4" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}

export function EntityDetailProfile({
  logoUrl,
  header,
  children,
}: {
  logoUrl?: string;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      {logoUrl ? (
        <div
          className="pointer-events-none absolute inset-0 bg-center bg-contain bg-no-repeat opacity-[0.05]"
          style={{
            backgroundImage: `url(${logoUrl})`,
            backgroundSize: "60%",
          }}
        />
      ) : null}
      <CardContent className="relative">
        <div className="space-y-4">
          {header}
          <hr />
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
