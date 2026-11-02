import { expect, test } from "vitest";
import { legacyPreadmissionFormDefinition } from "@/lib/forms/legacy-preadmission-template";
import { upgradeProgramFormDefinition } from "@/components/sections/shell/programs/create/form-builder/utils";
import {
  getProgramSummaryFields,
  getSelectedSummaryFields,
} from "./summary-fields";
import type { ProgramFormDefinition } from "@/components/sections/shell/programs/create/form-builder/types";

function form() {
  const definition: ProgramFormDefinition = structuredClone(
    legacyPreadmissionFormDefinition,
  );
  definition.steps[0].elements.push({
    id: "contract-custom-id",
    name: "select_a8f3",
    label: "Contract",
    fieldType: "Select",
    options: [
      { id: "yes", label: "YES", value: "YES" },
      { id: "no", label: "NO", value: "NO" },
    ],
  });
  return definition;
}

test.each([1, 2] as const)(
  "v%i defaults include existing summary fields and Contract without core or static fields",
  (version) => {
    const definition =
      version === 2 ? upgradeProgramFormDefinition(form()) : form();
    const ids = getSelectedSummaryFields(definition).map(
      ({ field }) => field.id,
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        "birth-date",
        "street-address",
        "needs-i20",
        "interested-in-boarding",
        "contract-custom-id",
      ]),
    );
    expect(ids).not.toContain("first-name");
    expect(ids).not.toContain("program");
    expect(ids).not.toContain("height");
    expect(
      getProgramSummaryFields(definition).every(
        ({ field }) => field.fieldType !== ("Text" as string),
      ),
    ).toBe(true);
  },
);

test("defaults only use fields present in the program", () => {
  const selected = getSelectedSummaryFields(legacyPreadmissionFormDefinition);
  expect(selected.some(({ field }) => field.label === "Contract")).toBe(false);
});

test("custom selections preserve an empty selection and do not add new fields", () => {
  const definition = form();
  expect(getSelectedSummaryFields(definition, [])).toEqual([]);
  expect(
    getSelectedSummaryFields(definition, ["height", "unknown"]).map(
      ({ field }) => field.id,
    ),
  ).toEqual(["height"]);
});

test("selection follows field identity instead of label, and uses form order", () => {
  const definition = form();
  const contract = definition.steps[0].elements.find(
    (field) => field.id === "contract-custom-id",
  )!;
  if (contract.fieldType === "Select") contract.label = "Agreement";
  const selected = getSelectedSummaryFields(definition, [
    "contract-custom-id",
    "height",
  ]);
  expect(selected.map(({ field }) => field.id)).toEqual([
    "height",
    "contract-custom-id",
  ]);
  expect(selected[1].field.label).toBe("Agreement");
});
