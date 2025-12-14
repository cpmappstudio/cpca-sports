"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { CreateOrganization } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateOrganizationCard() {
  const t = useTranslations("Admin.organizations");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="h-full w-full text-left">
          <Card className="h-full min-h-[120px] border-dashed hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Plus className="size-6" />
              <span className="text-sm font-medium">{t("create")}</span>
            </div>
          </Card>
        </button>
      </DialogTrigger>
      <DialogContent className=" p-0">
        <DialogHeader className="hidden">
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>
        <CreateOrganization
          afterCreateOrganizationUrl="/admin/organizations"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full",
            },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
