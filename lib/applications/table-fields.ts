import { parseProgramFormDefinition } from "@/components/sections/shell/programs/create/form-builder/utils";
import type { ProgramFormFieldElement } from "@/components/sections/shell/programs/create/form-builder/types";
import { getProgramSummaryFields } from "./summary-fields";

export const DEFAULT_APPLICATION_COLUMNS = [
  "_creationTime",
  "fullName",
  "program",
  "enrollmentYear",
  "contact",
  "paymentProgress",
  "status",
];

export interface ApplicationTableField {
  id: string;
  label: string;
  section: string;
  programs: string[];
}

export interface ApplicationTableConfiguration {
  visibleColumns: string[];
  fields: ApplicationTableField[];
}

export function getApplicationFieldColumnId(
  sectionKey: string,
  field: ProgramFormFieldElement,
) {
  const type =
    field.fieldType === "Input"
      ? `${field.fieldType}-${field.inputType}`
      : field.fieldType === "DatePicker"
        ? `${field.fieldType}-${field.mode}`
        : field.fieldType;
  return `form:${[sectionKey, field.id, field.name, type].map(encodeURIComponent).join(":")}`;
}

export function buildApplicationFieldCatalog(
  programs: Array<{ name: string; formDefinition?: string }>,
) {
  const catalog = new Map<
    string,
    ApplicationTableField & { context: string }
  >();
  for (const program of programs) {
    const definition = parseProgramFormDefinition(program.formDefinition);
    const available = new Set(
      getProgramSummaryFields(definition).map(({ field }) => field.id),
    );
    for (const step of definition.steps) {
      let context = step.title;
      for (const field of step.elements) {
        if (field.fieldType === "Text") {
          if (field.variant !== "P" && field.content.trim())
            context = field.content;
          continue;
        }
        if (
          field.fieldType === "Separator" ||
          !available.has(field.id) ||
          (step.id === "athlete" && field.name === "enrollmentYear")
        )
          continue;
        const id = getApplicationFieldColumnId(step.id, field);
        const existing = catalog.get(id);
        if (existing) {
          if (!existing.programs.includes(program.name))
            existing.programs.push(program.name);
        } else {
          catalog.set(id, {
            id,
            label: field.label || field.name,
            section: step.title,
            programs: [program.name],
            context,
          });
        }
      }
    }
  }
  const fields = [...catalog.values()];
  const labels = fields.map((field) => field.label);
  for (const field of fields) {
    if (labels.filter((label) => label === field.label).length > 1)
      field.label += ` — ${field.context}`;
  }
  const contextualLabels = fields.map((field) => field.label);
  for (const field of fields) {
    if (contextualLabels.filter((label) => label === field.label).length > 1)
      field.label += ` (${field.programs.join(", ")})`;
  }
  return fields.map(({ id, label, section, programs }) => ({
    id,
    label,
    section,
    programs,
  }));
}
