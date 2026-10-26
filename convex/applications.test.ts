/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { FormData } from "../lib/applications/types";

const modules = import.meta.glob("./**/*.ts");

async function setup(version?: 1 | 2) {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId: "admin",
      firstName: "Admin",
      lastName: "Test",
      email: "admin@example.com",
      isActive: true,
      isSuperAdmin: true,
    });
    const organizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "org-test",
      name: "Test",
      slug: "test",
      createdAt: Date.now(),
    });
    const programId = await ctx.db.insert("programs", {
      organizationId,
      name: "Real program",
      isDraft: false,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const photoStorageId = await ctx.storage.store(new Blob(["old photo"]));
    const applicant = {
      firstName: "Original",
      lastName: "Applicant",
      email: "applicant@example.com",
      telephone: "5551234",
      photoStorageId,
    };
    const formData: FormData =
      version === 2
        ? { custom: { number: 7 } }
        : {
            athlete: {
              ...applicant,
              photo: photoStorageId,
              program: "hardcoded-sport",
            },
          };
    const applicationId = await ctx.db.insert("applications", {
      userId,
      organizationId,
      programId,
      applicationCode: "APP-TEST",
      status: "pending",
      applicant,
      programSnapshot: { name: "Real program" },
      formDefinitionSnapshot: version
        ? JSON.stringify({ version, isMultiStep: false, steps: [] })
        : undefined,
      formData,
    });
    return { applicationId, applicant, photoStorageId, programId };
  });
  return { t, admin: t.withIdentity({ subject: "admin" }), ...fixture };
}

test.each([1, 2] as const)(
  "saving a v%i edit keeps the latest photo",
  async (version) => {
    const { t, admin, applicationId, applicant, photoStorageId } =
      await setup(version);
    const newPhoto = await t.run((ctx) =>
      ctx.storage.store(new Blob(["new photo"])),
    );
    await admin.mutation(api.applications.updatePhoto, {
      applicationId,
      photoStorageId: newPhoto,
    });
    await admin.mutation(api.applications.updateFormData, {
      applicationId,
      applicant: { ...applicant, firstName: "Edited" },
      formData: { custom: { number: 8 } },
      replaceAll: true,
    });
    const saved = await t.run((ctx) =>
      ctx.db.get("applications", applicationId),
    );
    expect(saved?.applicant?.photoStorageId).toBe(newPhoto);
    expect(saved?.formData.athlete?.photo).toBe(newPhoto);
    expect(
      await t.run(
        async (ctx) => (await ctx.storage.get(photoStorageId)) !== null,
      ),
    ).toBe(false);
    expect(
      await t.run(async (ctx) => (await ctx.storage.get(newPhoto)) !== null),
    ).toBe(true);
  },
);

test("dynamic legacy forms keep their stored copy in sync with the core applicant", async () => {
  const { t, admin, applicationId, applicant } = await setup(1);
  await admin.mutation(api.applications.updateFormData, {
    applicationId,
    applicant: { ...applicant, firstName: "Edited" },
    formData: { athlete: { program: "hardcoded-sport" } },
    replaceAll: true,
  });
  const saved = await t.run((ctx) => ctx.db.get("applications", applicationId));
  expect(saved?.applicant?.firstName).toBe("Edited");
  expect(saved?.formData.athlete.firstName).toBe("Edited");
  expect(saved?.formData.athlete.program).toBe("hardcoded-sport");
  expect(saved?.programSnapshot?.name).toBe("Real program");
  expect(JSON.parse(saved!.formDefinitionSnapshot!).version).toBe(1);
});

test("legacy form edits still update the applicant from athlete data", async () => {
  const { t, admin, applicationId } = await setup();
  await admin.mutation(api.applications.updateFormData, {
    applicationId,
    formData: { athlete: { firstName: "Legacy edit" } },
  });
  const saved = await t.run((ctx) => ctx.db.get("applications", applicationId));
  expect(saved?.applicant?.firstName).toBe("Legacy edit");
  expect(saved?.formData.athlete.program).toBe("hardcoded-sport");
  expect(saved?.formDefinitionSnapshot).toBeUndefined();
});

test("retrying the same photo update does not delete the photo", async () => {
  const { t, admin, applicationId, photoStorageId } = await setup(2);
  await admin.mutation(api.applications.updatePhoto, {
    applicationId,
    photoStorageId,
  });
  expect(
    await t.run(
      async (ctx) => (await ctx.storage.get(photoStorageId)) !== null,
    ),
  ).toBe(true);
});

test("new applications retain their real program and form when that program is later edited", async () => {
  const { t, admin, programId, applicant } = await setup(2);
  const definition = JSON.stringify({
    version: 2,
    isMultiStep: false,
    steps: [{ id: "custom", title: "Custom", icon: "number", elements: [] }],
  });
  await admin.mutation(api.programs.save, {
    programId,
    name: "Real program",
    formDefinition: definition,
    saveProgram: true,
    saveTemplate: false,
    documentConfigs: [
      { documentTypeId: "consent", name: "Consent", visibility: "required" },
    ],
    paymentConfigs: [
      {
        feeKey: "tuition",
        name: "Tuition",
        totalAmount: 10000,
        downPaymentPercent: 100,
        isRequired: true,
        isRefundable: false,
        isIncluded: false,
      },
    ],
  });
  const { applicationId } = await admin.mutation(api.applications.submit, {
    organizationSlug: "test",
    programId,
    applicant,
    formData: { custom: { number: 7 } },
  });
  await admin.mutation(api.programs.save, {
    programId,
    name: "Changed program",
    formDefinition: JSON.stringify({ version: 2, steps: [] }),
    saveProgram: true,
    saveTemplate: false,
  });
  const saved = await t.run((ctx) => ctx.db.get("applications", applicationId));
  expect(saved?.programId).toBe(programId);
  expect(saved?.programSnapshot?.name).toBe("Real program");
  expect(saved?.formDefinitionSnapshot).toBe(definition);
  expect(saved?.paymentSummary?.totalDue).toBe(10000);
  expect(saved?.formData).toEqual({ custom: { number: 7 } });
  const documents = await t.run((ctx) =>
    ctx.db
      .query("applicationDocumentConfig")
      .withIndex("byApplication", (q) => q.eq("applicationId", applicationId))
      .collect(),
  );
  expect(documents).toHaveLength(1);
  expect(documents[0].documentTypeId).toBe("consent");
});
