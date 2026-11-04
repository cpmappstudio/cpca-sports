/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function setup(legacy = false) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", {
      clerkId: "admin",
      firstName: "Admin",
      lastName: "Test",
      email: "admin@example.com",
      isActive: true,
      isSuperAdmin: true,
    });
    const ownerId = await ctx.db.insert("users", {
      clerkId: "owner",
      firstName: "Owner",
      lastName: "Test",
      email: "owner@example.com",
      isActive: true,
      isSuperAdmin: false,
    });
    const organizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "org",
      slug: "school",
      name: "School",
      createdAt: 1,
    });
    const otherOrgId = await ctx.db.insert("organizations", {
      clerkOrgId: "other",
      slug: "other",
      name: "Other",
      createdAt: 1,
    });
    const definition = JSON.stringify({
      version: 2,
      isMultiStep: false,
      steps: [],
    });
    const programId = await ctx.db.insert("programs", {
      organizationId,
      name: "Soccer",
      isDraft: false,
      formDefinition: definition,
      createdBy: adminId,
      createdAt: 1,
      updatedAt: 1,
    });
    const otherProgramId = await ctx.db.insert("programs", {
      organizationId,
      name: "Baseball",
      isDraft: false,
      formDefinition: definition,
      createdBy: adminId,
      createdAt: 1,
      updatedAt: 1,
    });
    const programConfigId = await ctx.db.insert("programDocumentConfig", {
      programId,
      documentTypeId: "consent",
      name: "Consent",
      description: "Original description",
      visibility: "required",
      updatedAt: 1,
      updatedBy: adminId,
    });
    const applications = [];
    const configIds = [];
    for (let index = 0; index < 30; index++) {
      const applicationId = await ctx.db.insert("applications", {
        userId: ownerId,
        organizationId,
        programId,
        applicationCode: `APP-${index}`,
        status: "pending",
        isArchived: index >= 28,
        formData: {},
      });
      applications.push(applicationId);
      configIds.push(
        await ctx.db.insert("applicationDocumentConfig", {
          applicationId,
          documentTypeId: "consent",
          name: "Consent",
          description: "Original description",
          visibility: "required",
          updatedAt: 1,
          updatedBy: adminId,
          isCustom: true,
          ...(legacy ? {} : { sourceProgramId: programId }),
        }),
      );
    }
    const otherApplicationId = await ctx.db.insert("applications", {
      userId: ownerId,
      organizationId,
      programId: otherProgramId,
      applicationCode: "BASEBALL",
      status: "pending",
      formData: {},
    });
    const foreignApplicationId = await ctx.db.insert("applications", {
      userId: ownerId,
      organizationId: otherOrgId,
      programId,
      applicationCode: "FOREIGN",
      status: "pending",
      formData: {},
    });
    return {
      adminId,
      programId,
      programConfigId,
      applications,
      configIds,
      otherApplicationId,
      foreignApplicationId,
    };
  });
  const admin = t.withIdentity({ subject: "admin" });
  const configs = (applicationId: (typeof ids.applications)[number]) =>
    admin.query(api.documents.getConfigByApplication, { applicationId });
  const finish = async () => {
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const jobs = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(jobs.filter((job) => job.state.kind === "failed")).toEqual([]);
  };
  return { t, admin, ...ids, configs, finish };
}

test("saving program documents adds requirements automatically across pages, including archived applications", async () => {
  const {
    t,
    admin,
    programId,
    applications,
    configs,
    finish,
    otherApplicationId,
    foreignApplicationId,
  } = await setup();
  await admin.mutation(api.programs.save, {
    programId,
    name: "Soccer",
    saveProgram: true,
    saveTemplate: false,
    documentConfigs: [
      {
        documentTypeId: "consent",
        name: "Consent",
        description: "Original description",
        visibility: "required",
      },
      {
        documentTypeId: "technical_sheet",
        name: "Ficha técnica",
        visibility: "required",
      },
    ],
  });
  await finish();
  for (const applicationId of applications) {
    const documents = await configs(applicationId);
    expect(documents).toHaveLength(2);
    expect(
      documents.find(
        (document) => document.documentTypeId === "technical_sheet",
      ),
    ).toMatchObject({
      name: "Ficha técnica",
      visibility: "required",
      sourceProgramId: programId,
    });
  }
  expect(await configs(otherApplicationId)).toEqual([]);
  expect(await configs(foreignApplicationId)).toEqual([]);
  const rows = await t.run((ctx) =>
    ctx.db.query("applicationDocumentConfig").collect(),
  );
  expect(
    new Set(rows.map((row) => `${row.applicationId}:${row.documentTypeId}`))
      .size,
  ).toBe(rows.length);
});

test("program edits update inherited metadata while application customizations take priority", async () => {
  const { admin, programConfigId, applications, configIds, configs, finish } =
    await setup();
  await admin.mutation(api.documents.updateVisibility, {
    applicationId: applications[1],
    documentTypeId: "consent",
    visibility: "hidden",
  });
  await admin.mutation(api.documents.updateCustomDocumentType, {
    configId: configIds[2],
    name: "Local requirement",
    description: "Local description",
    required: false,
  });
  await admin.mutation(api.programDocuments.updateType, {
    configId: programConfigId,
    name: "Updated consent",
    required: false,
  });
  await finish();
  expect((await configs(applications[0]))[0]).toMatchObject({
    name: "Updated consent",
    visibility: "optional",
  });
  expect((await configs(applications[0]))[0].description).toBeUndefined();
  expect((await configs(applications[1]))[0]).toMatchObject({
    name: "Consent",
    visibility: "hidden",
    isCustomized: true,
  });
  expect((await configs(applications[2]))[0]).toMatchObject({
    name: "Local requirement",
    description: "Local description",
    visibility: "optional",
  });
});

test("removing a program requirement keeps uploaded files and review status, and removes only unmodified empty requirements", async () => {
  const { t, admin, adminId, programConfigId, applications, configs, finish } =
    await setup();
  const file = await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(["approved file"]));
    const documentId = await ctx.db.insert("applicationDocuments", {
      applicationId: applications[0],
      documentTypeId: "consent",
      name: "Consent",
      storageId,
      fileName: "signed.pdf",
      contentType: "application/pdf",
      fileSize: 13,
      status: "approved",
      uploadedBy: adminId,
      uploadedAt: 1,
    });
    return {
      storageId,
      documentId,
      before: await ctx.db.get("applicationDocuments", documentId),
    };
  });
  await admin.mutation(api.documents.updateVisibility, {
    applicationId: applications[2],
    documentTypeId: "consent",
    visibility: "optional",
  });
  await admin.mutation(api.programDocuments.deleteType, {
    configId: programConfigId,
  });
  await finish();
  expect((await configs(applications[0]))[0]).toMatchObject({
    name: "Consent",
    visibility: "optional",
  });
  expect(await configs(applications[1])).toEqual([]);
  expect((await configs(applications[2]))[0].visibility).toBe("optional");
  expect(
    await t.run((ctx) => ctx.db.get("applicationDocuments", file.documentId)),
  ).toEqual(file.before);
  expect(
    await t.run(
      async (ctx) => (await ctx.storage.get(file.storageId)) !== null,
    ),
  ).toBe(true);
  await admin.mutation(api.documents.remove, { documentId: file.documentId });
  expect(await configs(applications[0])).toEqual([]);
});

test("a requirement removed locally does not reappear in later synchronizations", async () => {
  const { t, admin, programId, configIds, applications, configs, finish } =
    await setup();
  await admin.mutation(api.documents.deleteCustomDocumentType, {
    configId: configIds[0],
  });
  expect(await configs(applications[0])).toEqual([]);
  await admin.mutation(api.programDocuments.updateVisibility, {
    programId,
    documentTypeId: "consent",
    visibility: "optional",
  });
  await finish();
  expect(await configs(applications[0])).toEqual([]);
  expect(
    await t.run((ctx) => ctx.db.get("applicationDocumentConfig", configIds[0])),
  ).toMatchObject({
    isRemoved: true,
    isCustomized: true,
    sourceProgramId: programId,
  });
  expect((await configs(applications[1]))[0].visibility).toBe("optional");
});

test("initialization preserves legacy differences and remains correct if a program changes before its queued batches run", async () => {
  const {
    t,
    admin,
    adminId,
    programId,
    programConfigId,
    configIds,
    applications,
    configs,
    finish,
  } = await setup(true);
  await t.run((ctx) =>
    ctx.db.patch("applicationDocumentConfig", configIds[1], {
      visibility: "optional",
    }),
  );
  await admin.mutation(api.documents.updateVisibility, {
    applicationId: applications[2],
    documentTypeId: "consent",
    visibility: "hidden",
  });
  await t.mutation(internal.documentSync.initializeProgram, {
    programId,
    actorUserId: adminId,
  });
  await admin.mutation(api.programDocuments.updateType, {
    configId: programConfigId,
    name: "New name",
    required: true,
  });
  await finish();
  expect((await configs(applications[0]))[0]).toMatchObject({
    name: "New name",
    sourceProgramId: programId,
    isCustomized: false,
  });
  expect((await configs(applications[1]))[0]).toMatchObject({
    name: "Consent",
    visibility: "optional",
    isCustomized: true,
  });
  expect((await configs(applications[2]))[0]).toMatchObject({
    name: "Consent",
    visibility: "hidden",
    isCustomized: true,
  });
  const before = await configs(applications[0]);
  await t.mutation(internal.documentSync.initializeProgram, {
    programId,
    actorUserId: adminId,
  });
  await finish();
  expect(await configs(applications[0])).toEqual(before);
});

test("rapid program updates converge to the latest values without duplicate application requirements", async () => {
  const { admin, programConfigId, applications, configs, finish } =
    await setup();
  await admin.mutation(api.programDocuments.updateType, {
    configId: programConfigId,
    name: "First",
    required: true,
  });
  await admin.mutation(api.programDocuments.updateType, {
    configId: programConfigId,
    name: "Latest",
    required: false,
  });
  await finish();
  for (const applicationId of applications) {
    const rows = await configs(applicationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Latest", visibility: "optional" });
  }
});

test("saving unchanged defaults preserves record IDs and does not schedule synchronization", async () => {
  const { t, admin, programId, programConfigId } = await setup();
  await admin.mutation(api.programs.save, {
    programId,
    name: "Soccer",
    saveProgram: true,
    saveTemplate: false,
    documentConfigs: [
      {
        documentTypeId: "consent",
        name: "Consent",
        description: "Original description",
        visibility: "required",
      },
    ],
  });
  expect(
    await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect()),
  ).toEqual([]);
  expect(
    await t.run((ctx) => ctx.db.get("programDocumentConfig", programConfigId)),
  ).not.toBeNull();
});

test("saving an unchanged application requirement does not detach it from program updates", async () => {
  const { admin, programConfigId, applications, configIds, configs, finish } =
    await setup();
  await admin.mutation(api.documents.updateVisibility, {
    applicationId: applications[0],
    documentTypeId: "consent",
    visibility: "required",
  });
  await admin.mutation(api.documents.updateCustomDocumentType, {
    configId: configIds[1],
    name: "Consent",
    description: "Original description",
    required: true,
  });
  await admin.mutation(api.programDocuments.updateType, {
    configId: programConfigId,
    name: "Updated",
    required: false,
  });
  await finish();
  for (const applicationId of applications.slice(0, 2)) {
    expect((await configs(applicationId))[0]).toMatchObject({
      name: "Updated",
      visibility: "optional",
      isCustomized: false,
    });
  }
});

test("new application requirements retain their program origin", async () => {
  const { t, admin, programId, configs, finish } = await setup();
  const { applicationId } = await admin.mutation(api.applications.submit, {
    organizationSlug: "school",
    programId,
    applicant: {
      firstName: "New",
      lastName: "Student",
      email: "new@example.com",
      telephone: "555",
    },
    formData: {},
  });
  expect((await configs(applicationId))[0]).toMatchObject({
    sourceProgramId: programId,
    name: "Consent",
  });
  await finish();
  expect(
    await t.run((ctx) => ctx.db.get("applications", applicationId)),
  ).toMatchObject({ programId });
});

test("direct additions synchronize automatically and preserve application-only requirements", async () => {
  const { admin, programId, applications, configs, finish } = await setup();
  await admin.mutation(api.documents.createCustomDocumentType, {
    applicationId: applications[0],
    name: "Local only",
    required: false,
  });
  await admin.mutation(api.programDocuments.createType, {
    programId,
    name: "Ficha técnica",
    required: true,
  });
  await finish();
  expect(
    (await configs(applications[0])).map((document) => document.name),
  ).toEqual(["Consent", "Local only", "Ficha técnica"]);
  expect(
    (await configs(applications[1])).map((document) => document.name),
  ).toEqual(["Consent", "Ficha técnica"]);
});

test("a queued synchronization leaves historical requirements intact if the program was deleted", async () => {
  const { admin, programId, programConfigId, applications, configs, finish } =
    await setup();
  const before = await configs(applications[0]);
  await admin.mutation(api.programDocuments.updateType, {
    configId: programConfigId,
    name: "Queued edit",
    required: true,
  });
  await admin.mutation(api.programs.remove, { programId });
  await finish();
  expect(await configs(applications[0])).toEqual(before);
});
