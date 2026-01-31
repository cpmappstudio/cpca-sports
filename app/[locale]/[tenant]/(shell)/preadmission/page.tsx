import CpcaHeader from "@/components/common/cpca-header";
import { PreAdmissionForm } from "@/components/sections/shell/preadmission/preadmission-form";
import { useTranslations } from "next-intl";

export default function PreadmissionPage() {
  const t = useTranslations("preadmission");
  return (
    <>
      <CpcaHeader title={t("title")} subtitle={t("description")} />
      <PreAdmissionForm />;
    </>
  );
}
