import type { ProgramFormDefinition } from "@/components/sections/shell/programs/create/form-builder/types";
import { isFieldElement } from "@/components/sections/shell/programs/create/form-builder/utils";
import { CORE_PROGRAM_FIELD_NAMES } from "@/lib/forms/program-form-core";

const DEFAULT_SUMMARY_FIELDS = new Set([
  "athlete.birthDate",
  "athlete.countryOfBirth",
  "athlete.countryOfCitizenship",
  "address.streetAddress",
  "athlete.format",
  "athlete.gradeEntering",
  "athlete.enrollmentYear",
  "athlete.graduationYear",
  "athlete.needsI20",
  "general.interestedInBoarding",
]);

export function getProgramSummaryFields(definition: ProgramFormDefinition) {
  return definition.steps.flatMap((step) =>
    step.elements
      .filter(isFieldElement)
      .filter(
        (field) =>
          !(
            (definition.version === 2 || step.id === "athlete") &&
            CORE_PROGRAM_FIELD_NAMES.has(field.name)
          ),
      )
      .map((field) => ({
        sectionKey: step.id,
        field,
      })),
  );
}

export function getSelectedSummaryFields(
  definition: ProgramFormDefinition,
  selectedIds?: string[],
) {
  const selected = selectedIds === undefined ? null : new Set(selectedIds);
  return getProgramSummaryFields(definition).filter(({ sectionKey, field }) =>
    selected
      ? selected.has(field.id)
      : DEFAULT_SUMMARY_FIELDS.has(`${sectionKey}.${field.name}`) ||
        field.label?.trim().toLowerCase() === "contract",
  );
}
