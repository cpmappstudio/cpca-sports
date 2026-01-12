"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AthleteStep } from "./steps/athlete-step";
import { AddressStep } from "./steps/address-step";
import { SchoolStep } from "./steps/school-step";
import { ParentsStep } from "./steps/parents-step";
import { GeneralStep } from "./steps/general-step";
import { StepsNavigation } from "./steps/steps-navigation";
import { SuccessMessage } from "./success-message";
import { usePreadmissionForm } from "./use-preadmission-form";

export function PreAdmissionForm() {
  const t = useTranslations("preadmission");
  const form = usePreadmissionForm();

  if (form.isSubmitted) {
    return (
      <SuccessMessage
        applicationCode={form.applicationCode}
        onNewApplication={form.handleNewApplication}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <StepsNavigation
          currentStep={form.currentStep}
          completedSteps={form.completedSteps}
          onStepClick={form.handleStepClick}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">
              {t(`steps.${form.currentStep}Title`)}
            </CardTitle>
            <CardDescription>
              {t(`steps.${form.currentStep}CardDescription`)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit}
              className="space-y-6 sm:space-y-8"
            >
              {form.currentStep === "athlete" && (
                <AthleteStep
                  formData={form.formData}
                  onChange={form.handleFieldChange}
                  errors={form.errors}
                />
              )}
              {form.currentStep === "address" && (
                <AddressStep
                  formData={form.formData}
                  onChange={form.handleFieldChange}
                  errors={form.errors}
                />
              )}
              {form.currentStep === "school" && (
                <SchoolStep
                  formData={form.formData}
                  onChange={form.handleFieldChange}
                  errors={form.errors}
                />
              )}
              {form.currentStep === "parents" && (
                <ParentsStep
                  formData={form.formData}
                  onChange={form.handleFieldChange}
                  errors={form.errors}
                />
              )}
              {form.currentStep === "general" && (
                <GeneralStep
                  formData={form.formData}
                  onChange={form.handleFieldChange}
                  errors={form.errors}
                />
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.handleBack}
                  disabled={form.isFirstStep}
                  className="w-full sm:w-auto"
                >
                  {t("navigation.back")}
                </Button>
                <Button
                  type={form.isLastStep ? "submit" : "button"}
                  onClick={form.isLastStep ? undefined : form.handleNext}
                  className="w-full sm:w-auto"
                >
                  {form.isLastStep
                    ? t("navigation.submit")
                    : t("navigation.next")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
