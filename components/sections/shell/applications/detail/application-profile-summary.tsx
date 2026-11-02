"use client";

import { useTranslations } from "next-intl";
import {
  BookOpen,
  Calendar,
  Circle,
  FileText,
  Globe,
  GraduationCap,
  Hash,
  Home,
  IdCard,
  Link,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import type { Application } from "@/lib/applications/types";
import { getFormField } from "@/lib/applications/types";
import { formatProgramFieldValue } from "@/lib/forms/format-field-value";
import { getCountryName } from "@/lib/countries/countries";
import { usesCoreApplicantFields } from "@/lib/forms/program-form-core";
import {
  getProgramSummaryFields,
  getSelectedSummaryFields,
} from "@/lib/applications/summary-fields";
import { parseProgramFormDefinition } from "@/components/sections/shell/programs/create/form-builder/utils";
import { buildInitialProgramFormValues } from "@/components/sections/shell/programs/create/form-builder/program-form-runtime";
import type { ProgramFormFieldElement } from "@/components/sections/shell/programs/create/form-builder/types";
import { getCatalogItem } from "@/components/sections/shell/programs/create/form-builder/catalog";

function getSummaryFieldIcon(field: ProgramFormFieldElement) {
  if (field.fieldType === "Input" && field.inputType !== "text") {
    return { number: Hash, url: Link, email: Mail, tel: Phone }[
      field.inputType
    ];
  }
  return getCatalogItem(field.fieldType)?.icon ?? Circle;
}

function calculateAge(birthDate: string) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()))
    age--;
  return age;
}

export function ApplicationProfileSummary({
  application,
}: {
  application: Application;
}) {
  const t = useTranslations("Applications.detail");
  const tAthlete = useTranslations("preadmission.athlete");
  const { formData, summaryConfiguration } = application;
  const get = (section: string, name: string) =>
    getFormField(formData, section, name);
  const birthDate = get("athlete", "birthDate");
  const grade = get("athlete", "gradeEntering");
  const street = get("address", "streetAddress");
  const city = get("address", "city");
  const country = get("address", "country");
  const needsI20 = get("athlete", "needsI20");
  const legacyI20Labels: Record<string, string> = {
    "no-citizen": tAthlete("i20NoCitizen"),
    "no-non-citizen": tAthlete("i20NoNonCitizen"),
    "yes-new": tAthlete("i20YesNew"),
    "yes-transfer": tAthlete("i20YesTransfer"),
    yes: t("yes"),
    no: t("no"),
  };
  const nativeRows = {
    "athlete.birthDate": {
      label: t("age"),
      icon: User,
      value: birthDate ? `${calculateAge(birthDate)} years` : "-",
    },
    "athlete.countryOfBirth": {
      label: t("birthCountry"),
      icon: Globe,
      value: getCountryName(get("athlete", "countryOfBirth")) || "-",
    },
    "athlete.countryOfCitizenship": {
      label: t("citizenship"),
      icon: Globe,
      value: getCountryName(get("athlete", "countryOfCitizenship")) || "-",
    },
    "address.streetAddress": {
      label: t("address"),
      icon: MapPin,
      value:
        street && city && country
          ? `${street}, ${city}, ${getCountryName(country)}`
          : "-",
    },
    "athlete.format": {
      label: t("format"),
      icon: FileText,
      value: get("athlete", "format") || "-",
    },
    "athlete.gradeEntering": {
      label: t("gradeEntering"),
      icon: GraduationCap,
      value: grade
        ? grade === "postgraduate"
          ? tAthlete("gradePostgraduate")
          : tAthlete(`grade${grade}`)
        : "-",
    },
    "athlete.enrollmentYear": {
      label: t("enrollmentYear"),
      icon: Calendar,
      value: get("athlete", "enrollmentYear") || "-",
    },
    "athlete.graduationYear": {
      label: t("graduationYear"),
      icon: Calendar,
      value: get("athlete", "graduationYear") || "-",
    },
    "athlete.needsI20": {
      label: t("needsI20"),
      icon: IdCard,
      value:
        legacyI20Labels[needsI20] ?? (needsI20 || t("summaryNoInformation")),
    },
    "general.interestedInBoarding": {
      label: t("boarding"),
      icon: Home,
      value:
        get("general", "interestedInBoarding") === "yes" ? t("yes") : t("no"),
    },
  };
  const definition = parseProgramFormDefinition(
    summaryConfiguration?.formDefinition,
  );
  const snapshot = parseProgramFormDefinition(
    application.formDefinitionSnapshot,
  );
  const historicalFields = new Map(
    getProgramSummaryFields(snapshot).map((entry) => [entry.field.id, entry]),
  );
  const currentValues = buildInitialProgramFormValues(definition, formData);
  const historicalValues = buildInitialProgramFormValues(snapshot, formData);
  const rows = summaryConfiguration
    ? getSelectedSummaryFields(definition, summaryConfiguration.fields).map(
        (entry) => {
          const historical = historicalFields.get(entry.field.id);
          const source =
            historical &&
            formData[historical.sectionKey]?.[historical.field.name] !==
              undefined
              ? historical
              : entry;
          const raw = formData[source.sectionKey]?.[source.field.name];
          const native =
            nativeRows[
              `${entry.sectionKey}.${entry.field.name}` as keyof typeof nativeRows
            ];
          const nativeValue =
            entry.sectionKey === "athlete" && entry.field.name === "needsI20"
              ? undefined
              : native?.value;
          const value =
            source === historical
              ? historicalValues[source.field.name]
              : currentValues[source.field.name];
          const missing =
            raw == null || (typeof raw === "string" && !raw.trim());
          return {
            id: entry.field.id,
            label: native?.label ?? (entry.field.label || entry.field.name),
            icon: native?.icon ?? getSummaryFieldIcon(entry.field),
            value: missing
              ? t("summaryNoInformation")
              : (nativeValue ??
                (formatProgramFieldValue(
                  source.field,
                  value,
                  t("yes"),
                  t("no"),
                ) ||
                  t("summaryNoInformation"))),
          };
        },
      )
    : usesCoreApplicantFields(application.formDefinitionSnapshot)
      ? []
      : Object.entries(nativeRows).map(([id, row]) => ({ id, ...row }));
  const program =
    application.programSnapshot?.name || get("athlete", "program");
  const contacts = usesCoreApplicantFields(application.formDefinitionSnapshot)
    ? [
        {
          id: "email",
          label: "",
          icon: Mail,
          value: application.applicant?.email || get("athlete", "email") || "-",
        },
        {
          id: "telephone",
          label: "",
          icon: Phone,
          value:
            application.applicant?.telephone ||
            get("athlete", "telephone") ||
            "-",
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 gap-3 text-sm">
      {[
        {
          id: "program",
          label: t("program"),
          icon: BookOpen,
          value: program || "-",
        },
        ...contacts,
        ...rows,
      ].map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <row.icon className="h-4 w-4 shrink-0 text-primary" />
          {row.label ? (
            <span className="font-semibold text-foreground">{row.label}:</span>
          ) : null}
          <span className="min-w-0 break-words whitespace-pre-wrap text-muted-foreground">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
