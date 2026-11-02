import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { ProgramFormFieldElement } from "@/components/sections/shell/programs/create/form-builder/types";

export function formatProgramFieldValue(
  field: ProgramFormFieldElement,
  value: unknown,
  yes: string,
  no: string,
) {
  if (typeof value === "boolean") return value ? yes : no;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "" : format(value, "PP");
  if (field.fieldType === "DatePicker" && field.mode === "range") {
    const range = value as DateRange | undefined;
    return range?.from && range.to
      ? `${format(range.from, "PP")} – ${format(range.to, "PP")}`
      : "";
  }
  if (field.fieldType === "Select" || field.fieldType === "RadioGroup") {
    return (
      field.options.find((option) => option.value === String(value))?.label ??
      String(value ?? "")
    );
  }
  return String(value ?? "");
}
