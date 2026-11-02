import { expect, test } from "vitest";
import type {
  ProgramFormDefinition,
  ProgramFormFieldElement,
} from "@/components/sections/shell/programs/create/form-builder/types";
import {
  buildApplicationFieldCatalog,
  getApplicationFieldColumnId,
} from "./table-fields";

function program(
  name: string,
  fields: ProgramFormDefinition["steps"][number]["elements"],
) {
  return {
    name,
    formDefinition: JSON.stringify({
      version: 1,
      steps: [{ id: "athlete", title: "Athlete", elements: fields }],
    }),
  };
}
const contract: ProgramFormFieldElement = {
  id: "contract",
  name: "select_a8f3",
  label: "Contract",
  fieldType: "Select",
  options: [{ id: "yes", value: "YES", label: "YES" }],
};

test("equivalent fields merge across programs while independent fields with the same label stay separate", () => {
  const catalog = buildApplicationFieldCatalog([
    program("Soccer", [contract]),
    program("Basketball", [contract]),
    program("Other", [
      { ...contract, id: "another-contract", name: "anotherContract" },
    ]),
  ]);
  expect(catalog).toHaveLength(2);
  expect(catalog[0].programs).toEqual(["Soccer", "Basketball"]);
  expect(catalog[1].programs).toEqual(["Other"]);
  expect(new Set(catalog.map((field) => field.label)).size).toBe(2);
});

test("field types and storage paths are part of the identity", () => {
  const number: ProgramFormFieldElement = {
    id: "same",
    name: "same",
    label: "Same",
    fieldType: "Input",
    inputType: "number",
  };
  const text: ProgramFormFieldElement = { ...number, inputType: "text" };
  expect(getApplicationFieldColumnId("athlete", number)).not.toBe(
    getApplicationFieldColumnId("athlete", text),
  );
  expect(getApplicationFieldColumnId("athlete", text)).not.toBe(
    getApplicationFieldColumnId("parents", text),
  );
});

test("section headings distinguish repeated parent labels and static or existing columns are excluded", () => {
  const catalog = buildApplicationFieldCatalog([
    program("School", [
      {
        id: "first-name",
        name: "firstName",
        label: "First Name",
        fieldType: "Input",
        inputType: "text",
      },
      {
        id: "enrollment-year",
        name: "enrollmentYear",
        label: "Enrollment Year",
        fieldType: "Input",
        inputType: "number",
      },
      {
        id: "parent1-title",
        name: "parent1Title",
        fieldType: "Text",
        static: true,
        variant: "H3",
        content: "Parent 1",
      },
      {
        id: "parent1-email",
        name: "parent1Email",
        label: "Email",
        fieldType: "Input",
        inputType: "email",
      },
      {
        id: "parent2-title",
        name: "parent2Title",
        fieldType: "Text",
        static: true,
        variant: "H3",
        content: "Parent 2",
      },
      {
        id: "parent2-email",
        name: "parent2Email",
        label: "Email",
        fieldType: "Input",
        inputType: "email",
      },
    ]),
  ]);
  expect(catalog.map((field) => field.label)).toEqual([
    "Email — Parent 1",
    "Email — Parent 2",
  ]);
});
