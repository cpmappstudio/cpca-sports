/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
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
      clerkOrgId: "school",
      name: "School",
      slug: "school",
      createdAt: 1,
    });
    const applicationId = await ctx.db.insert("applications", {
      userId: ownerId,
      organizationId,
      applicationCode: "DOC-TEST",
      status: "pending",
      formData: {},
    });
    const storageId = await ctx.storage.store(new Blob(["original file"]));
    const documentId = await ctx.db.insert("applicationDocuments", {
      applicationId,
      documentTypeId: "legacy_waiver",
      name: "Autorización",
      description: "Firmada por el tutor",
      storageId,
      fileName: "original.pdf",
      contentType: "application/pdf",
      fileSize: 13,
      status: "approved",
      uploadedBy: ownerId,
      uploadedAt: 1,
    });
    return { adminId, applicationId, documentId };
  });
  return {
    t,
    ...ids,
    admin: t.withIdentity({ subject: "admin" }),
    owner: t.withIdentity({ subject: "owner" }),
  };
}

test.each([false, true])(
  "a historical requirement keeps its name after file removal and supports uploading again (nameless config: %s)",
  async (hasNamelessConfig) => {
    const { t, admin, owner, adminId, applicationId, documentId } =
      await setup();
    const initialConfigId = hasNamelessConfig
      ? await t.run((ctx) =>
          ctx.db.insert("applicationDocumentConfig", {
            applicationId,
            documentTypeId: "legacy_waiver",
            visibility: "optional",
            description: "Notas existentes",
            updatedAt: 1,
            updatedBy: adminId,
          }),
        )
      : undefined;
    const configId = await admin.mutation(api.documents.updateVisibility, {
      applicationId,
      documentTypeId: "legacy_waiver",
      visibility: "required",
    });
    if (initialConfigId) expect(configId).toBe(initialConfigId);
    const config = await t.run((ctx) =>
      ctx.db.get("applicationDocumentConfig", configId),
    );
    expect(config).toMatchObject({
      name: "Autorización",
      visibility: "required",
      description: hasNamelessConfig
        ? "Notas existentes"
        : "Firmada por el tutor",
    });
    await owner.mutation(api.documents.remove, { documentId });
    expect(
      await owner.query(api.documents.getByApplication, { applicationId }),
    ).toEqual([]);
    expect(
      await owner.query(api.documents.getConfigByApplication, {
        applicationId,
      }),
    ).toEqual([config]);
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["corrected file"])),
    );
    await owner.mutation(api.documents.upload, {
      applicationId,
      documentTypeId: "legacy_waiver",
      name: config!.name!,
      description: config!.description,
      storageId,
      fileName: "corrected.pdf",
      contentType: "application/pdf",
      fileSize: 14,
    });
    const documents = await owner.query(api.documents.getByApplication, {
      applicationId,
    });
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      name: "Autorización",
      fileName: "corrected.pdf",
      status: "pending",
    });
    expect(
      await owner.query(api.documents.getConfigByApplication, {
        applicationId,
      }),
    ).toEqual([config]);
  },
);

test("visibility changes preserve existing requirement names and descriptions", async () => {
  const { t, admin, adminId, applicationId } = await setup();
  const configId = await t.run((ctx) =>
    ctx.db.insert("applicationDocumentConfig", {
      applicationId,
      documentTypeId: "legacy_waiver",
      name: "Nombre personalizado",
      description: "Descripción personalizada",
      visibility: "optional",
      isCustom: true,
      updatedAt: 1,
      updatedBy: adminId,
    }),
  );
  await admin.mutation(api.documents.updateVisibility, {
    applicationId,
    documentTypeId: "legacy_waiver",
    visibility: "hidden",
  });
  expect(
    await t.run((ctx) => ctx.db.get("applicationDocumentConfig", configId)),
  ).toMatchObject({
    name: "Nombre personalizado",
    description: "Descripción personalizada",
    isCustom: true,
    visibility: "hidden",
  });
});

test("applicants cannot change document requirements", async () => {
  const { t, owner, applicationId } = await setup();
  await expect(
    owner.mutation(api.documents.updateVisibility, {
      applicationId,
      documentTypeId: "legacy_waiver",
      visibility: "required",
    }),
  ).rejects.toThrow("Admin access required");
  expect(
    await t.run((ctx) => ctx.db.query("applicationDocumentConfig").collect()),
  ).toEqual([]);
});
