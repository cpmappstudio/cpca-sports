/// <reference types="vite/client" />
import type { GenericDatabaseWriter, GenericDataModel } from "convex/server";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const user = (clerkId: string, isSuperAdmin = false) =>
      ctx.db.insert("users", {
        clerkId,
        firstName: clerkId,
        lastName: "Test",
        email: `${clerkId}@example.com`,
        isActive: true,
        isSuperAdmin,
      });
    const adminId = await user("admin", true);
    const ownerId = await user("owner");
    const outsiderId = await user("outsider");
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
    const formDefinition = JSON.stringify({
      version: 2,
      isMultiStep: false,
      steps: [],
    });
    const programId = await ctx.db.insert("programs", {
      organizationId,
      name: "Soccer",
      isDraft: false,
      formDefinition,
      createdBy: adminId,
      createdAt: 1,
      updatedAt: 1,
    });
    const otherProgramId = await ctx.db.insert("programs", {
      organizationId: otherOrgId,
      name: "Other",
      isDraft: false,
      formDefinition,
      createdBy: adminId,
      createdAt: 1,
      updatedAt: 1,
    });
    const application = (code: string) =>
      ctx.db.insert("applications", {
        organizationId,
        programId,
        userId: ownerId,
        applicationCode: code,
        status: "pending",
        formData: {},
      });
    const applicationId = await application("APP-1");
    const secondApplicationId = await application("APP-2");
    return {
      adminId,
      ownerId,
      outsiderId,
      organizationId,
      programId,
      otherProgramId,
      applicationId,
      secondApplicationId,
      formDefinition,
    };
  });
  const admin = t.withIdentity({ subject: "admin" });
  const owner = t.withIdentity({ subject: "owner" });
  const outsider = t.withIdentity({ subject: "outsider" });
  const register = async (
    target:
      { programId: Id<"programs"> } | { applicationId: Id<"applications"> },
    name = "form.pdf",
    type = "application/pdf",
    size = 4,
  ) => {
    const upload = await admin.mutation(
      api.documentAttachments.generateUploadUrl,
      {
        target,
        fileName: name,
        contentType: type,
        fileSize: size,
      },
    );
    const storageId = await t.run(async (ctx) => {
      const id = await ctx.storage.store(
        new Blob([new Uint8Array(size)], { type }),
      );
      // convex-test omits contentType when storing blobs.
      await (ctx.db as GenericDatabaseWriter<GenericDataModel>).patch(id, {
        contentType: type,
      });
      return id;
    });
    const attachment = await admin.mutation(api.documentAttachments.register, {
      attachmentId: upload.attachmentId,
      storageId,
    });
    return { ...attachment, storageId };
  };
  const save = (attachmentId?: Id<"documentAttachments">) =>
    admin.mutation(api.programs.save, {
      programId: ids.programId,
      name: "Soccer",
      saveProgram: true,
      saveTemplate: false,
      documentConfigs: [
        {
          documentTypeId: "form",
          name: "Consent",
          visibility: "required",
          attachmentId,
        },
      ],
    });
  const finish = () => t.finishAllScheduledFunctions(vi.runAllTimers);
  const configs = (applicationId = ids.applicationId) =>
    owner.query(api.documents.getConfigByApplication, { applicationId });
  return { t, admin, owner, outsider, register, save, finish, configs, ...ids };
}

test("program attachments synchronize, new applications inherit them, and applicant submissions retain their review state", async () => {
  const {
    t,
    admin,
    owner,
    register,
    save,
    finish,
    configs,
    programId,
    applicationId,
    adminId,
  } = await setup();
  const attachment = await register({ programId });
  expect(await configs()).toEqual([]);
  await save(attachment.id);
  await finish();
  const config = (await configs())[0];
  expect(config.attachment).toMatchObject({
    id: attachment.id,
    fileName: "form.pdf",
    contentType: "application/pdf",
    fileSize: 4,
  });
  expect(config.attachment?.url).toBeTruthy();
  expect(
    await owner.query(api.documents.getSummary, { applicationId }),
  ).toMatchObject({ total: 0, approved: 0 });
  const documentId = await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(["signed"]));
    return await ctx.db.insert("applicationDocuments", {
      applicationId,
      documentTypeId: "form",
      name: "Consent",
      storageId,
      fileName: "signed.pdf",
      contentType: "application/pdf",
      fileSize: 6,
      status: "approved",
      uploadedBy: adminId,
      uploadedAt: 1,
      reviewedBy: adminId,
      reviewedAt: 2,
    });
  });
  const before = await t.run((ctx) =>
    ctx.db.get("applicationDocuments", documentId),
  );
  const replacement = await register({ programId }, "updated.pdf");
  await save(replacement.id);
  await finish();
  expect(
    await t.run((ctx) => ctx.db.get("applicationDocuments", documentId)),
  ).toEqual(before);
  expect((await configs())[0]._id).toBe(config._id);
  expect((await configs())[0].attachment?.id).toBe(replacement.id);
  expect(
    await t.run((ctx) => ctx.db.system.get("_storage", attachment.storageId)),
  ).toBeNull();
  const newApp = await admin.mutation(api.applications.submit, {
    organizationSlug: "school",
    programId,
    applicant: {
      firstName: "New",
      lastName: "Student",
      email: "new@example.com",
      telephone: "123",
    },
    formData: {},
  });
  expect(
    (
      await admin.query(api.documents.getConfigByApplication, {
        applicationId: newApp.applicationId,
      })
    )[0].attachmentId,
  ).toBe(replacement.id);
  await finish();
});

test("individual attachments and explicit removals remain local exceptions during subsequent program synchronization", async () => {
  const {
    t,
    admin,
    register,
    save,
    finish,
    configs,
    programId,
    applicationId,
    secondApplicationId,
  } = await setup();
  const shared = await register({ programId });
  await save(shared.id);
  await finish();
  const local = await register({ applicationId }, "local.pdf");
  await admin.mutation(api.documents.updateRequirement, {
    applicationId,
    documentTypeId: "form",
    attachmentId: local.id,
  });
  const replacement = await register({ programId }, "latest.pdf");
  await save(replacement.id);
  await finish();
  expect((await configs())[0]).toMatchObject({
    attachmentId: local.id,
    isCustomized: true,
  });
  expect((await configs(secondApplicationId))[0].attachmentId).toBe(
    replacement.id,
  );
  await admin.mutation(api.documents.updateRequirement, {
    applicationId,
    documentTypeId: "form",
    attachmentId: null,
  });
  await save();
  await save(replacement.id);
  await finish();
  expect((await configs())[0].attachmentId).toBeUndefined();
  expect(
    await t.run((ctx) => ctx.db.system.get("_storage", local.storageId)),
  ).toBeNull();
  expect(
    await t.run((ctx) => ctx.db.system.get("_storage", replacement.storageId)),
  ).not.toBeNull();
});

test("invalid files and unauthorized writes are rejected without replacing the current attachment", async () => {
  const {
    t,
    owner,
    outsider,
    admin,
    register,
    save,
    finish,
    configs,
    applicationId,
    secondApplicationId,
    programId,
    otherProgramId,
  } = await setup();
  const original = await register({ programId });
  await save(original.id);
  await finish();
  const before = await configs();
  for (const client of [owner, outsider]) {
    await expect(
      client.mutation(api.documentAttachments.generateUploadUrl, {
        target: { programId },
        fileName: "form.pdf",
        contentType: "application/pdf",
        fileSize: 4,
      }),
    ).rejects.toThrow("Admin access required");
    await expect(
      client.mutation(api.documents.updateRequirement, {
        applicationId,
        documentTypeId: "form",
        attachmentId: null,
      }),
    ).rejects.toThrow("Admin access required");
  }
  await expect(
    outsider.query(api.documents.getConfigByApplication, { applicationId }),
  ).rejects.toThrow("Unauthorized");
  const otherOrg = await register({ programId: otherProgramId });
  const otherApplication = await register({
    applicationId: secondApplicationId,
  });
  for (const attachment of [otherOrg, otherApplication]) {
    await expect(
      admin.mutation(api.documents.updateRequirement, {
        applicationId,
        documentTypeId: "form",
        attachmentId: attachment.id,
      }),
    ).rejects.toThrow("Attachment not available");
    await expect(save(attachment.id)).rejects.toThrow(
      "Attachment not available",
    );
  }
  await expect(
    register({ programId }, "script.html", "text/html"),
  ).rejects.toThrow("Invalid attachment file");
  await expect(
    register(
      { programId },
      "large.pdf",
      "application/pdf",
      10 * 1024 * 1024 + 1,
    ),
  ).rejects.toThrow("Invalid attachment file");
  await expect(
    register({ programId }, "empty.pdf", "application/pdf", 0),
  ).rejects.toThrow("Invalid attachment file");
  expect(await configs()).toEqual(before);
  expect(
    await t.run((ctx) => ctx.db.system.get("_storage", original.storageId)),
  ).not.toBeNull();
  await finish();
});

test("template copies and the storage cleanup retain shared files until their last reference is removed", async () => {
  const {
    t,
    admin,
    register,
    save,
    finish,
    configs,
    programId,
    formDefinition,
  } = await setup();
  const attachment = await register({ programId });
  await save(attachment.id);
  await finish();
  const { templateId } = await admin.mutation(api.programs.save, {
    programId,
    name: "Soccer",
    saveProgram: false,
    saveTemplate: true,
    formDefinition,
    templateName: "Reusable",
    templateSections: [],
  });
  expect(templateId).not.toBeNull();
  expect(
    (
      await admin.query(api.templateDocuments.getByTemplate, {
        templateId: templateId!,
      })
    )[0].attachmentId,
  ).toBe(attachment.id);
  vi.stubEnv("LEGACY_MIGRATION_SECRET", "test-secret");
  const cleanup = await t.mutation(api.legacyMigration.cleanupOrphanedStorage, {
    secret: "test-secret",
    dryRun: false,
  });
  expect(cleanup.deletedStorageFiles).toBe(0);
  const config = (
    await admin.query(api.programDocuments.getByProgram, { programId })
  )[0];
  await admin.mutation(api.programDocuments.deleteType, {
    configId: config._id,
  });
  await finish();
  expect(await configs()).toEqual([]);
  expect(
    await t.run((ctx) => ctx.db.system.get("_storage", attachment.storageId)),
  ).not.toBeNull();
  await admin.mutation(api.formTemplates.remove, { templateId: templateId! });
  await finish();
  expect(
    await t.run((ctx) => ctx.db.system.get("_storage", attachment.storageId)),
  ).toBeNull();
  expect(
    await t.run((ctx) => ctx.db.get("documentAttachments", attachment.id)),
  ).toBeNull();
});

test("hidden requirements do not expose attachment URLs to applicants and abandoned uploads are reclaimed", async () => {
  const {
    t,
    admin,
    register,
    save,
    finish,
    configs,
    programId,
    applicationId,
  } = await setup();
  const attachment = await register({ programId });
  await save(attachment.id);
  await finish();
  const config = (await configs())[0];
  await admin.mutation(api.documents.updateVisibility, {
    applicationId,
    documentTypeId: "form",
    visibility: "hidden",
  });
  expect((await configs())[0].attachment).toBeUndefined();
  expect(
    (
      await admin.query(api.documents.getConfigByApplication, { applicationId })
    )[0].attachment?.id,
  ).toBe(attachment.id);
  const unused = await register({ programId }, "unused.pdf");
  await finish();
  expect(
    await t.run((ctx) => ctx.db.system.get("_storage", unused.storageId)),
  ).toBeNull();
  expect(
    await t.run((ctx) => ctx.db.get("applicationDocumentConfig", config._id)),
  ).not.toBeNull();
});

test("upload registration rejects existing files, other upload owners and metadata mismatches", async () => {
  const { t, admin, owner, programId, save, finish } = await setup();
  const oldStorageId = await t.run(async (ctx) => {
    const id = await ctx.storage.store(
      new Blob(["test"], { type: "application/pdf" }),
    );
    await (ctx.db as GenericDatabaseWriter<GenericDataModel>).patch(id, {
      contentType: "application/pdf",
    });
    return id;
  });
  vi.advanceTimersByTime(1);
  const upload = await admin.mutation(
    api.documentAttachments.generateUploadUrl,
    {
      target: { programId },
      fileName: "form.pdf",
      contentType: "application/pdf",
      fileSize: 4,
    },
  );
  await expect(save(upload.attachmentId)).rejects.toThrow(
    "Attachment not available",
  );
  await expect(
    admin.mutation(api.documentAttachments.register, {
      attachmentId: upload.attachmentId,
      storageId: oldStorageId,
    }),
  ).rejects.toThrow("Invalid attachment file");
  const storageId = await t.run(async (ctx) => {
    const id = await ctx.storage.store(
      new Blob(["test"], { type: "application/pdf" }),
    );
    await (ctx.db as GenericDatabaseWriter<GenericDataModel>).patch(id, {
      contentType: "application/pdf",
    });
    return id;
  });
  await expect(
    owner.mutation(api.documentAttachments.register, {
      attachmentId: upload.attachmentId,
      storageId,
    }),
  ).rejects.toThrow("Attachment upload not available");
  const first = await admin.mutation(api.documentAttachments.register, {
    attachmentId: upload.attachmentId,
    storageId,
  });
  expect(
    await admin.mutation(api.documentAttachments.register, {
      attachmentId: upload.attachmentId,
      storageId,
    }),
  ).toEqual(first);
  await save(upload.attachmentId);
  await finish();
});

test("document creation and editing commit attachment and requirement changes together", async () => {
  const {
    t,
    admin,
    register,
    applicationId,
    otherProgramId,
    programId,
    save,
    finish,
    configs,
  } = await setup();
  const local = await register({ applicationId }, "local-form.pdf");
  const otherOrg = await register({ programId: otherProgramId });
  const createArgs = {
    applicationId,
    name: "Local requirement",
    description: "Complete this",
    required: true,
  };
  await expect(
    admin.mutation(api.documents.createCustomDocumentType, {
      ...createArgs,
      attachmentId: otherOrg.id,
    }),
  ).rejects.toThrow("Attachment not available");
  expect(await configs()).toEqual([]);
  await admin.mutation(api.documents.createCustomDocumentType, {
    ...createArgs,
    attachmentId: local.id,
  });
  expect((await configs())[0]).toMatchObject({
    name: "Local requirement",
    description: "Complete this",
    visibility: "required",
    attachmentId: local.id,
  });
  await save();
  await finish();
  const inherited = (await configs()).find(
    (config) => config.documentTypeId === "form",
  )!;
  await t.run((ctx) =>
    ctx.db.patch("applicationDocumentConfig", inherited._id, {
      isCustom: undefined,
    }),
  );
  const before = await configs();
  await expect(
    admin.mutation(api.documents.updateRequirement, {
      applicationId,
      documentTypeId: "form",
      name: "Changed",
      required: false,
      attachmentId: otherOrg.id,
    }),
  ).rejects.toThrow("Attachment not available");
  expect(await configs()).toEqual(before);
  const global = await register({ programId });
  await admin.mutation(api.documents.updateRequirement, {
    applicationId,
    documentTypeId: "form",
    name: "Changed",
    description: "Updated",
    required: false,
    attachmentId: global.id,
  });
  expect(
    (await configs()).find((config) => config.documentTypeId === "form"),
  ).toMatchObject({
    name: "Changed",
    description: "Updated",
    visibility: "optional",
    attachmentId: global.id,
    isCustomized: true,
  });
  await admin.mutation(api.documents.updateRequirement, {
    applicationId,
    documentTypeId: "form",
    name: "Changed",
    required: false,
    attachmentId: null,
  });
  expect(
    (await configs()).find((config) => config.documentTypeId === "form")
      ?.attachmentId,
  ).toBeUndefined();
  await finish();
});
