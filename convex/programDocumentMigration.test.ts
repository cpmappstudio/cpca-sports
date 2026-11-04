/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const migration = internal.migrations.programDocuments.seedDefaults;
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const actorUserId = await ctx.db.insert("users", {
      clerkId: "admin",
      firstName: "Admin",
      lastName: "Test",
      email: "admin@example.com",
      isActive: true,
      isSuperAdmin: true,
    });
    const organizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "school",
      name: "School",
      slug: "school",
      createdAt: 1,
    });
    const otherOrganizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "other",
      name: "Other",
      slug: "other",
      createdAt: 1,
    });
    const formDefinition = JSON.stringify({
      version: 2,
      isMultiStep: false,
      steps: [],
    });
    const program = (name: string, org = organizationId, isDraft = false) =>
      ctx.db.insert("programs", {
        organizationId: org,
        name,
        isDraft,
        isActive: true,
        formDefinition,
        createdBy: actorUserId,
        createdAt: 1,
        updatedAt: 1,
      });
    const programIds = await Promise.all(
      [
        "Basketball",
        "Soccer",
        "Volleyball",
        "Baseball",
        "Baseball PR",
        "Basketball PR",
        "Volleyball Club",
      ].map((name) => program(name)),
    );
    const staffId = await program("CPCA Sports Staff", organizationId, true);
    const otherProgramId = await program("Other", otherOrganizationId);
    const application = (
      code: string,
      programId?: typeof staffId,
      isArchived = false,
    ) =>
      ctx.db.insert("applications", {
        organizationId,
        programId,
        userId: actorUserId,
        applicationCode: code,
        status: "pending",
        isArchived,
        formData: {},
      });
    const applications = await Promise.all(
      Array.from({ length: 28 }, (_, index) =>
        application(`APP-${index}`, programIds[0], index >= 26),
      ),
    );
    for (const applicationId of applications.slice(1, 3)) {
      await ctx.db.insert("applicationDocumentConfig", {
        applicationId,
        documentTypeId: "arrival_departure_dates",
        visibility: "required",
        updatedAt: 1,
        updatedBy: actorUserId,
      });
    }
    const staffApplicationId = await application("STAFF", staffId);
    const unlinkedId = await application("UNLINKED");
    const storageId = await ctx.storage.store(new Blob(["original file"]));
    const documentId = await ctx.db.insert("applicationDocuments", {
      applicationId: applications[0],
      documentTypeId: "birth_certificate",
      name: "Birth Certificate",
      storageId,
      fileName: "birth.pdf",
      contentType: "application/pdf",
      fileSize: 13,
      status: "approved",
      uploadedAt: 1,
      uploadedBy: actorUserId,
      reviewedBy: actorUserId,
      reviewedAt: 2,
    });
    const templateId = await ctx.db.insert("formTemplates", {
      organizationId,
      name: "Base",
      version: 1,
      isPublished: false,
      sections: [],
      formDefinition,
    });
    return {
      actorUserId,
      organizationId,
      programIds,
      staffId,
      otherProgramId,
      applications,
      staffApplicationId,
      unlinkedId,
      documentId,
      storageId,
      templateId,
    };
  });
  const finish = async () => {
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const jobs = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(jobs.filter((job) => job.state.kind === "failed")).toEqual([]);
  };
  return {
    t,
    ...ids,
    finish,
    admin: t.withIdentity({ subject: "admin" }),
    args: {
      organizationId: ids.organizationId,
      actorUserId: ids.actorUserId,
      programIds: ids.programIds,
    },
  };
}

test("simulation reports 19 defaults for each selected empty program without writing or scheduling", async () => {
  const { t, args } = await setup();
  const result = await t.mutation(migration, args);
  expect(result.dryRun).toBe(true);
  expect(result.programs).toHaveLength(7);
  expect(result.programs.every((p) => p.added === 19 && !p.skipped)).toBe(true);
  const counts = await t.run(async (ctx) => ({
    programs: (await ctx.db.query("programDocumentConfig").collect()).length,
    applications: (await ctx.db.query("applicationDocumentConfig").collect())
      .length,
    templates: (await ctx.db.query("templateDocumentConfig").collect()).length,
    jobs: (await ctx.db.system.query("_scheduled_functions").collect()).length,
  }));
  expect(counts).toEqual({
    programs: 0,
    applications: 2,
    templates: 0,
    jobs: 0,
  });
});

test("seeding uses normal synchronization across pages, preserves deliveries, and skips configured programs on retries", async () => {
  const {
    t,
    args,
    applications,
    staffApplicationId,
    unlinkedId,
    documentId,
    storageId,
    finish,
    admin,
    programIds,
    templateId,
  } = await setup();
  const before = await t.run(async (ctx) => ({
    delivery: await ctx.db.get("applicationDocuments", documentId),
    program: await ctx.db.get("programs", programIds[0]),
    template: await ctx.db.get("formTemplates", templateId),
  }));
  const result = await t.mutation(migration, { ...args, dryRun: false });
  expect(result.programs.every((p) => p.added === 19 && !p.skipped)).toBe(true);
  await finish();
  const configs = await t.run((ctx) =>
    ctx.db.query("programDocumentConfig").collect(),
  );
  expect(configs).toHaveLength(7 * 19);
  for (const applicationId of applications) {
    const inherited = await admin.query(api.documents.getConfigByApplication, {
      applicationId,
    });
    expect(inherited).toHaveLength(19);
    expect(inherited.every((c) => c.sourceProgramId === programIds[0])).toBe(
      true,
    );
    expect(inherited.every((c) => !!c.name && !c.isCustomized)).toBe(true);
  }
  for (const applicationId of [staffApplicationId, unlinkedId]) {
    expect(
      await admin.query(api.documents.getConfigByApplication, {
        applicationId,
      }),
    ).toEqual([]);
  }
  expect(
    await t.run((ctx) => ctx.db.query("templateDocumentConfig").collect()),
  ).toEqual([]);
  expect(
    await t.run((ctx) => ctx.db.get("applicationDocuments", documentId)),
  ).toEqual(before.delivery);
  expect(await t.run((ctx) => ctx.db.get("programs", programIds[0]))).toEqual(
    before.program,
  );
  expect(await t.run((ctx) => ctx.db.get("formTemplates", templateId))).toEqual(
    before.template,
  );
  expect(
    await t.run(async (ctx) => (await ctx.storage.get(storageId)) !== null),
  ).toBe(true);
  const next = await admin.mutation(api.applications.submit, {
    organizationSlug: "school",
    programId: programIds[0],
    applicant: {
      firstName: "New",
      lastName: "Student",
      email: "new@example.com",
      telephone: "555",
    },
    formData: {},
  });
  const inherited = await admin.query(api.documents.getConfigByApplication, {
    applicationId: next.applicationId,
  });
  expect(inherited).toHaveLength(19);
  expect(inherited.every((c) => c.sourceProgramId === programIds[0])).toBe(
    true,
  );
  const jobs = await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect(),
  );
  const repeat = await t.mutation(migration, { ...args, dryRun: false });
  expect(repeat.programs.every((p) => p.added === 0 && p.skipped)).toBe(true);
  expect(
    await t.run((ctx) => ctx.db.query("programDocumentConfig").collect()),
  ).toEqual(configs);
  expect(
    await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect()),
  ).toEqual(jobs);
});

test("an already configured program is left intact while the remaining empty programs are seeded", async () => {
  const { t, args, programIds, finish } = await setup();
  const id = await t.run((ctx) =>
    ctx.db.insert("programDocumentConfig", {
      programId: programIds[0],
      documentTypeId: "custom",
      name: "Existing requirement",
      visibility: "optional",
      updatedAt: 1,
      updatedBy: args.actorUserId,
    }),
  );
  const before = await t.run((ctx) => ctx.db.get("programDocumentConfig", id));
  const result = await t.mutation(migration, { ...args, dryRun: false });
  expect(result.programs[0]).toMatchObject({ added: 0, skipped: true });
  await finish();
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("programDocumentConfig")
        .withIndex("byProgram", (q) => q.eq("programId", programIds[0]))
        .collect(),
    ),
  ).toEqual([before]);
});

test("targets from another organization roll back all writes and scheduled synchronization", async () => {
  const { t, args, otherProgramId } = await setup();
  await expect(
    t.mutation(migration, {
      ...args,
      programIds: [...args.programIds, otherProgramId],
      dryRun: false,
    }),
  ).rejects.toThrow("Program does not belong");
  expect(
    await t.run((ctx) => ctx.db.query("programDocumentConfig").collect()),
  ).toEqual([]);
  expect(
    await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect()),
  ).toEqual([]);
});

test.each(["draft", "inactive"] as const)(
  "%s programs cannot be seeded",
  async (kind) => {
    const { t, args, programIds } = await setup();
    await t.run((ctx) =>
      ctx.db.patch(
        "programs",
        programIds[1],
        kind === "draft" ? { isDraft: true } : { isActive: false },
      ),
    );
    await expect(
      t.mutation(migration, { ...args, dryRun: false }),
    ).rejects.toThrow("Program must be published and active");
    expect(
      await t.run((ctx) => ctx.db.query("programDocumentConfig").collect()),
    ).toEqual([]);
  },
);

test("an actor without organization admin access cannot run the migration", async () => {
  const { t, args } = await setup();
  await t.run((ctx) =>
    ctx.db.patch("users", args.actorUserId, { isSuperAdmin: false }),
  );
  await expect(
    t.mutation(migration, { ...args, dryRun: false }),
  ).rejects.toThrow("Admin access required");
});

test("empty or repeated targets are rejected", async () => {
  const { t, args, programIds } = await setup();
  for (const targets of [[], [programIds[0], programIds[0]]]) {
    await expect(
      t.mutation(migration, { ...args, programIds: targets }),
    ).rejects.toThrow("Invalid migration targets");
  }
});
