/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
vi.mock("./clerk", () => ({ clerkClient: {} }));
const modules = import.meta.glob("./**/*.ts");
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

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
    const ownerId = await user("owner");
    const adminId = await user("admin", true);
    await user("outsider");
    const organizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "org",
      slug: "school",
      name: "School",
      createdAt: 1,
    });
    const applicationId = await ctx.db.insert("applications", {
      organizationId,
      userId: ownerId,
      applicationCode: "PDF",
      status: "pending",
      formData: {},
    });
    const sourceStorageId = await ctx.storage.store(
      new Blob(["%PDF-1.7 original"], { type: "application/pdf" }),
    );
    const sourceAttachmentId = await ctx.db.insert("documentAttachments", {
      organizationId,
      storageId: sourceStorageId,
      uploadedBy: adminId,
      fileName: "form.pdf",
      contentType: "application/pdf",
      fileSize: 17,
    });
    const configId = await ctx.db.insert("applicationDocumentConfig", {
      applicationId,
      documentTypeId: "consent",
      name: "Consent",
      attachmentId: sourceAttachmentId,
      visibility: "required",
      updatedBy: adminId,
      updatedAt: 1,
    });
    return {
      applicationId,
      ownerId,
      adminId,
      organizationId,
      configId,
      sourceAttachmentId,
      sourceStorageId,
    };
  });
  const args = {
    applicationId: ids.applicationId,
    documentTypeId: "consent",
    sourceAttachmentId: ids.sourceAttachmentId,
    expectedStorageId: null,
    saveId: "first-save",
  };
  const owner = t.withIdentity({ subject: "owner" });
  const admin = t.withIdentity({ subject: "admin" });
  const store = (text = "%PDF-1.7 filled") =>
    t.run((ctx) =>
      ctx.storage.store(new Blob([text], { type: "application/pdf" })),
    );
  const submit = async (saveArgs = args, body = "%PDF-1.7 filled") => {
    const query = new URLSearchParams(
      Object.entries(saveArgs).filter(([, value]) => value !== null) as [
        string,
        string,
      ][],
    );
    return owner.fetch(`/application-document-pdf?${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "X-File-Name": "completed.pdf",
      },
      body,
    });
  };
  return { t, owner, admin, args, store, submit, ...ids };
}

test("PDF submission preserves the school original, stores provenance, and reopens the delivered copy", async () => {
  const { t, owner, args, sourceStorageId, submit } = await setup();
  const response = await submit();
  expect(response.status).toBe(200);
  const { storageId } = await response.json();
  const documents = await owner.query(api.documents.getByApplication, {
    applicationId: args.applicationId,
  });
  expect(documents).toHaveLength(1);
  expect(documents[0]).toMatchObject({
    storageId,
    sourceAttachmentId: args.sourceAttachmentId,
    lastSaveId: args.saveId,
    status: "pending",
  });
  expect(
    await t.run(async (ctx) =>
      (await ctx.storage.get(sourceStorageId))?.text(),
    ),
  ).toBe("%PDF-1.7 original");
  expect(
    await owner.query(api.documentPdf.get, {
      applicationId: args.applicationId,
      documentTypeId: args.documentTypeId,
    }),
  ).toMatchObject({
    storageId,
    needsRestart: false,
    fileName: "completed.pdf",
  });
});

test("retries are idempotent and cannot delete the committed PDF", async () => {
  const { owner, t, args, submit, store } = await setup();
  const first = await submit();
  const saved = await first.json();
  const retry = await submit();
  expect(await retry.json()).toEqual(saved);
  const extra = await store();
  expect(
    await owner.mutation(internal.documentPdf.complete, {
      ...args,
      fileName: "copy.pdf",
      storageId: extra,
    }),
  ).toBe(saved.storageId);
  await t.mutation(internal.documentPdf.discard, {
    applicationId: args.applicationId,
    documentTypeId: args.documentTypeId,
    storageId: saved.storageId,
  });
  expect(await t.run((ctx) => ctx.storage.get(extra))).toBeNull();
  expect(
    await t.run(async (ctx) => !!(await ctx.storage.get(saved.storageId))),
  ).toBe(true);
  expect(
    await owner.query(api.documents.getByApplication, {
      applicationId: args.applicationId,
    }),
  ).toHaveLength(1);
});

test("concurrent deliveries and source changes reject stale saves without replacing the current delivery", async () => {
  const { t, owner, args, submit, store, configId } = await setup();
  const saved = await (await submit()).json();
  const stale = await submit({ ...args, saveId: "stale-save" });
  expect(stale.status).toBe(409);
  expect(await stale.json()).toEqual({ error: "PDF_CONFLICT" });
  await t.run((ctx) => ctx.db.patch(configId, { attachmentId: undefined }));
  await expect(
    owner.mutation(internal.documentPdf.complete, {
      ...args,
      expectedStorageId: saved.storageId,
      saveId: "new-save",
      storageId: await store(),
      fileName: "new.pdf",
    }),
  ).rejects.toThrow("PDF_UNAVAILABLE");
  expect(
    (
      await owner.query(api.documents.getByApplication, {
        applicationId: args.applicationId,
      })
    )[0].storageId,
  ).toBe(saved.storageId);
});

test("authorizes the owner or school admin and excludes removed or hidden requirements", async () => {
  const { t, owner, args, store, configId } = await setup();
  const outsider = t.withIdentity({ subject: "outsider" });
  expect(
    await outsider.query(api.documentPdf.get, {
      applicationId: args.applicationId,
      documentTypeId: args.documentTypeId,
    }),
  ).toBeNull();
  await expect(
    outsider.mutation(internal.documentPdf.complete, {
      ...args,
      storageId: await store(),
      fileName: "bad.pdf",
    }),
  ).rejects.toThrow("Unauthorized");
  await t.run((ctx) => ctx.db.patch(configId, { visibility: "hidden" }));
  expect(
    await owner.query(api.documentPdf.get, {
      applicationId: args.applicationId,
      documentTypeId: args.documentTypeId,
    }),
  ).toBeNull();
  await t.run((ctx) =>
    ctx.db.patch(configId, { visibility: "required", isRemoved: true }),
  );
  expect(
    await owner.query(api.documentPdf.get, {
      applicationId: args.applicationId,
      documentTypeId: args.documentTypeId,
    }),
  ).toBeNull();
});

test("a new source requires explicit restart; old originals live until the last delivery is removed", async () => {
  const {
    t,
    owner,
    args,
    configId,
    submit,
    sourceAttachmentId,
    organizationId,
    adminId,
  } = await setup();
  await submit();
  const newSource = await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["%PDF-1.7 new"], { type: "application/pdf" }),
    );
    const id = await ctx.db.insert("documentAttachments", {
      organizationId,
      storageId,
      uploadedBy: adminId,
      fileName: "new.pdf",
      contentType: "application/pdf",
      fileSize: 12,
    });
    await ctx.db.patch(configId, { attachmentId: id });
    return id;
  });
  expect(
    await owner.query(api.documentPdf.get, {
      applicationId: args.applicationId,
      documentTypeId: args.documentTypeId,
    }),
  ).toMatchObject({ needsRestart: true, sourceAttachmentId: newSource });
  await t.mutation(internal.documentAttachments.cleanup, {
    attachmentId: sourceAttachmentId,
  });
  expect(await t.run((ctx) => ctx.db.get(sourceAttachmentId))).not.toBeNull();
  const current = (
    await owner.query(api.documents.getByApplication, {
      applicationId: args.applicationId,
    })
  )[0];
  await owner.mutation(api.documents.remove, { documentId: current._id });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.get(sourceAttachmentId))).toBeNull();
  expect(await t.run((ctx) => ctx.db.get(newSource))).not.toBeNull();
});

test("manual replacement drops PDF provenance and clears previous review metadata", async () => {
  const { t, owner, admin, args, submit, store, sourceStorageId } =
    await setup();
  const saved = await (await submit()).json();
  const original = (
    await owner.query(api.documents.getByApplication, {
      applicationId: args.applicationId,
    })
  )[0];
  await admin.mutation(api.documents.updateStatus, {
    documentId: original._id,
    status: "approved",
  });
  await owner.mutation(api.documents.upload, {
    applicationId: args.applicationId,
    documentTypeId: args.documentTypeId,
    name: "Consent",
    storageId: await store(),
    fileName: "manual.pdf",
    contentType: "application/pdf",
    fileSize: 16,
  });
  const current = (
    await owner.query(api.documents.getByApplication, {
      applicationId: args.applicationId,
    })
  )[0];
  expect(current.status).toBe("pending");
  expect(current.sourceAttachmentId).toBeUndefined();
  expect(current.reviewedBy).toBeUndefined();
  expect(
    await t.run(async (ctx) => !!(await ctx.storage.get(saved.storageId))),
  ).toBe(false);
  expect(
    await t.run(async (ctx) => !!(await ctx.storage.get(sourceStorageId))),
  ).toBe(true);
});

test.each(["not a PDF", "%PDF-" + "a".repeat(10 * 1024 * 1024)])(
  "invalid or oversized PDFs are rejected before creating a delivery",
  async (body) => {
    const { owner, args, submit } = await setup();
    const response = await submit(args, body);
    expect(response.status).toBe(400);
    expect(
      await owner.query(api.documents.getByApplication, {
        applicationId: args.applicationId,
      }),
    ).toEqual([]);
  },
);

test("deleting an application releases originals retained only by its PDF deliveries", async () => {
  const { t, admin, applicationId, sourceAttachmentId, submit, configId } =
    await setup();
  await submit();
  await t.run((ctx) => ctx.db.patch(configId, { attachmentId: undefined }));
  await t.mutation(internal.documentAttachments.cleanup, {
    attachmentId: sourceAttachmentId,
  });
  expect(await t.run((ctx) => ctx.db.get(sourceAttachmentId))).not.toBeNull();
  await admin.mutation(api.applications.deleteApplication, { applicationId });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.get(sourceAttachmentId))).toBeNull();
});
