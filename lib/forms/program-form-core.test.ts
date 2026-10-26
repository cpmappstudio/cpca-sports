import { expect, test } from "vitest";
import { legacyPreadmissionFormDefinition } from "./legacy-preadmission-template";
import {
  CORE_PROGRAM_FIELD_NAMES,
  usesCoreApplicantFields,
} from "./program-form-core";
import {
  createEmptyFormDefinition,
  getProgramFormFieldNameErrors,
  parseProgramFormDefinition,
  serializeProgramFormDefinition,
  upgradeProgramFormDefinition,
} from "@/components/sections/shell/programs/create/form-builder/utils";

test("existing form definitions keep their version and hardcoded program options", () => {
  const serialized = serializeProgramFormDefinition(
    legacyPreadmissionFormDefinition,
  );
  const parsed = parseProgramFormDefinition(serialized);
  expect(parsed.version).toBe(1);
  expect(
    parsed.steps[0].elements.find((element) => element.name === "program"),
  ).toMatchObject(
    legacyPreadmissionFormDefinition.steps[0].elements.find(
      (element) => element.name === "program",
    )!,
  );
  expect(usesCoreApplicantFields(serialized)).toBe(false);
});

test("new forms use core fields and copying a legacy template does not duplicate them", () => {
  expect(createEmptyFormDefinition().version).toBe(2);
  const legacy = parseProgramFormDefinition(
    JSON.stringify(legacyPreadmissionFormDefinition),
  );
  const original = structuredClone(legacy);
  const upgraded = upgradeProgramFormDefinition(legacy);
  expect(upgraded.version).toBe(2);
  expect(
    upgraded.steps
      .flatMap((step) => step.elements)
      .some((element) => CORE_PROGRAM_FIELD_NAMES.has(element.name)),
  ).toBe(false);
  expect(legacy).toEqual(original);
  const serialized = serializeProgramFormDefinition(upgraded);
  expect(parseProgramFormDefinition(serialized)).toEqual(upgraded);
  expect(usesCoreApplicantFields(serialized)).toBe(true);
});

test("the builder prevents creating a second core field only for new forms", () => {
  const legacy = structuredClone(legacyPreadmissionFormDefinition);
  expect(getProgramFormFieldNameErrors(legacy)).toEqual({});
  const current = { ...legacy, version: 2 as const };
  expect(getProgramFormFieldNameErrors(current)).toMatchObject({
    "first-name": "duplicate",
    program: "duplicate",
  });
});
