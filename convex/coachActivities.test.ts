/// <reference types="vite/client" />
import type {
  GenericDatabaseWriter,
  GenericDataModel,
  FunctionArgs,
} from "convex/server";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import {
  coachActivityDateTime,
  coachActivityDurationMs,
  legacyActivityTimestamp,
} from "./lib/coachActivityTime";

const modules = import.meta.glob("./**/*.ts");
const now = Date.parse("2026-11-06T15:00:00Z");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const user = (clerkId: string) =>
      ctx.db.insert("users", {
        clerkId,
        firstName: clerkId,
        lastName: "Test",
        email: `${clerkId}@example.com`,
        isActive: true,
        isSuperAdmin: false,
      });
    const ownerId = await user("owner");
    const otherCoachUserId = await user("otherCoach");
    const adminId = await user("admin");
    const otherAdminId = await user("otherAdmin");
    const organizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "org",
      name: "School",
      slug: "school",
      createdAt: now,
    });
    const otherOrganizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "otherOrg",
      name: "Other",
      slug: "other",
      createdAt: now,
    });
    for (const [userId, orgId, role] of [
      [ownerId, organizationId, "member"],
      [otherCoachUserId, organizationId, "member"],
      [adminId, organizationId, "admin"],
      [otherAdminId, otherOrganizationId, "admin"],
    ] as const) {
      await ctx.db.insert("organizationMembers", {
        userId,
        organizationId: orgId,
        role,
        clerkMembershipId: `${userId}-membership`,
        createdAt: now,
      });
    }
    const program = (orgId: typeof organizationId, name: string) =>
      ctx.db.insert("programs", {
        organizationId: orgId,
        name,
        isDraft: false,
        createdBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
    const programId = await program(organizationId, "Baseball");
    const secondProgramId = await program(organizationId, "Other program");
    const otherProgramId = await program(otherOrganizationId, "Other school");
    const option = (
      programId: Id<"programs">,
      name: string,
      kind: "place" | "position" = "place",
    ) =>
      ctx.db.insert("programCoachOptions", {
        programId,
        name,
        kind,
        normalizedName: name.toLowerCase(),
        createdBy: adminId,
        createdAt: now,
      });
    const placeId = await option(programId, "Field");
    const secondPlaceId = await option(programId, "Gym");
    const secondProgramPlaceId = await option(secondProgramId, "New field");
    const otherPlaceId = await option(otherProgramId, "Other school field");
    const positionId = await option(programId, "Coach", "position");
    const coach = (userId: typeof ownerId) =>
      ctx.db.insert("coaches", {
        organizationId,
        userId,
        programId,
        positionId,
        isArchived: false,
        createdBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
    const coachId = await coach(ownerId);
    const otherCoachId = await coach(otherCoachUserId);
    return {
      ownerId,
      adminId,
      organizationId,
      programId,
      secondProgramId,
      placeId,
      secondPlaceId,
      secondProgramPlaceId,
      otherPlaceId,
      positionId,
      coachId,
      otherCoachId,
    };
  });
  const owner = t.withIdentity({ subject: "owner" });
  const admin = t.withIdentity({ subject: "admin" });
  const otherAdmin = t.withIdentity({ subject: "otherAdmin" });
  const otherCoach = t.withIdentity({ subject: "otherCoach" });
  let counter = 0;
  const image = (contentType = "image/jpeg", size = 10) =>
    t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob([new Uint8Array(size).fill(++counter)], { type: contentType }),
      );
      // convex-test's stored blobs need explicit contentType metadata.
      await (ctx.db as GenericDatabaseWriter<GenericDataModel>).patch(
        storageId,
        { contentType },
      );
      return storageId;
    });
  const checkIn = async (
    overrides: Partial<FunctionArgs<typeof api.coachActivities.checkIn>> = {},
  ) =>
    owner.mutation(api.coachActivities.checkIn, {
      coachId: ids.coachId,
      placeId: ids.placeId,
      title: "  Batting practice  ",
      description: "  Fundamentals  ",
      imageStorageId: overrides.imageStorageId ?? (await image()),
      ...overrides,
    });
  const get = (activityId: Awaited<ReturnType<typeof checkIn>>) =>
    owner.query(api.coachActivities.getById, { activityId });
  const legacy = async (completed = false) => {
    const imageStorageId = await image();
    return t.run((ctx) =>
      ctx.db.insert("coachActivities", {
        coachId: ids.coachId,
        programId: ids.programId,
        placeId: ids.placeId,
        placeName: "Field",
        title: "Manual activity",
        activityDate: "2025-03-01",
        startTime: "08:00",
        endTime: "09:00",
        completed,
        imageStorageId,
        createdBy: ids.ownerId,
        updatedBy: ids.ownerId,
        createdAt: now,
        updatedAt: now,
      }),
    );
  };
  return {
    t,
    ...ids,
    owner,
    admin,
    otherAdmin,
    otherCoach,
    image,
    checkIn,
    get,
    legacy,
  };
}

test("check-in uses server time in Poinciana and leaves checkout unset", async () => {
  const f = await setup();
  const imageStorageId = await f.image();
  const serverTime = now + 1000;
  vi.setSystemTime(serverTime);
  const id = await f.checkIn({ imageStorageId });
  const record = await f.get(id);
  expect(record).toMatchObject({
    coachId: f.coachId,
    programId: f.programId,
    title: "Batting practice",
    description: "Fundamentals",
    placeName: "Field",
    activityDate: "2026-11-06",
    startTime: "10:00",
    checkInAt: serverTime,
    timeZone: "America/New_York",
    status: "in_progress",
    completed: false,
    createdBy: f.ownerId,
    updatedBy: f.ownerId,
  });
  expect(record?.endTime).toBeUndefined();
  expect(record?.checkOutAt).toBeUndefined();
  expect(record?.checkOutImageStorageId).toBeUndefined();
  expect(record?.checkOutImageUrl).toBeNull();
  expect(record?.imageUrl).toEqual(expect.any(String));
});

test("one coach may have several open activities and close each independently", async () => {
  const f = await setup();
  const first = await f.checkIn();
  vi.setSystemTime(now + 1000);
  const second = await f.checkIn();
  const open = await f.owner.query(api.coachActivities.listOpenByCoach, {
    coachId: f.coachId,
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(open.page.map((r) => r._id)).toEqual([second, first]);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: first,
    imageStorageId: await f.image(),
  });
  expect((await f.get(second))?.status).toBe("in_progress");
  expect((await f.get(first))?.status).toBe("completed");
});

test("check-in retry with the same photo returns the original record and preserves its timestamps", async () => {
  const f = await setup();
  const photo = await f.image();
  const first = await f.checkIn({ imageStorageId: photo });
  const originalTime = (await f.get(first))?.checkInAt;
  vi.setSystemTime(now + 60000);
  expect(await f.checkIn({ imageStorageId: photo })).toBe(first);
  expect((await f.get(first))?.checkInAt).toBe(originalTime);
  expect(
    (
      await f.owner.query(api.coachActivities.listOpenByCoach, {
        coachId: f.coachId,
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).page,
  ).toHaveLength(1);
});

test("checkout adds its own photo and server timestamp without changing check-in", async () => {
  const f = await setup();
  const id = await f.checkIn();
  const before = await f.get(id);
  const photo = await f.image();
  vi.setSystemTime(now + 3600000);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: photo,
  });
  expect(await f.get(id)).toMatchObject({
    checkInAt: before!.checkInAt,
    imageStorageId: before!.imageStorageId,
    checkOutAt: now + 3600000,
    checkOutImageStorageId: photo,
    checkOutImageUrl: expect.any(String),
    endTime: "11:00",
    status: "completed",
    completed: true,
  });
});

test("checkout retry is idempotent and a second photo cannot overwrite the exit", async () => {
  const f = await setup();
  const id = await f.checkIn();
  const photo = await f.image();
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: photo,
  });
  const before = await f.get(id);
  vi.setSystemTime(now + 86400000);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: photo,
  });
  expect(await f.get(id)).toEqual(before);
  await expect(
    f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: await f.image(),
    }),
  ).rejects.toThrow("not open");
  expect(await f.get(id)).toEqual(before);
});

test("checkout on a later day keeps the full timestamp even when its clock time is earlier", async () => {
  const f = await setup();
  vi.setSystemTime(Date.parse("2026-11-07T04:50:00Z"));
  const id = await f.checkIn();
  vi.setSystemTime(Date.parse("2026-11-07T05:10:00Z"));
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: await f.image(),
  });
  expect(await f.get(id)).toMatchObject({
    activityDate: "2026-11-06",
    startTime: "23:50",
    endTime: "00:10",
    checkOutAt: Date.parse("2026-11-07T05:10:00Z"),
    status: "completed",
  });
});

test.each([
  ["2026-01-15T15:00:00Z", "2026-01-15", "10:00"],
  ["2026-07-15T15:00:00Z", "2026-07-15", "11:00"],
  ["2026-03-08T06:59:00Z", "2026-03-08", "01:59"],
  ["2026-03-08T07:00:00Z", "2026-03-08", "03:00"],
  ["2026-11-01T05:59:00Z", "2026-11-01", "01:59"],
  ["2026-11-01T06:00:00Z", "2026-11-01", "01:00"],
])("Poinciana date and time for %s", (iso, activityDate, time) => {
  expect(coachActivityDateTime(Date.parse(iso))).toEqual({
    activityDate,
    time,
  });
});

test("checkout across the autumn clock change records increasing instants", async () => {
  const entry = Date.parse("2026-11-01T05:50:00Z");
  const exit = Date.parse("2026-11-01T06:10:00Z");
  vi.setSystemTime(entry - 60000);
  const f = await setup();
  const entryPhoto = await f.image();
  const exitPhoto = await f.image();
  vi.setSystemTime(entry);
  const id = await f.checkIn({ imageStorageId: entryPhoto });
  vi.setSystemTime(exit);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: exitPhoto,
  });
  expect(await f.get(id)).toMatchObject({
    checkInAt: entry,
    checkOutAt: exit,
    startTime: "01:50",
    endTime: "01:10",
  });
});

test.each([false, true])(
  "title, description and place remain editable after checkout=%s",
  async (closed) => {
    const f = await setup();
    const id = await f.checkIn();
    if (closed)
      await f.owner.mutation(api.coachActivities.checkOut, {
        activityId: id,
        imageStorageId: await f.image(),
      });
    const before = await f.get(id);
    await f.owner.mutation(api.coachActivities.update, {
      activityId: id,
      placeId: f.secondPlaceId,
      title: "  Corrected  ",
      description: "  New description  ",
    });
    const after = await f.get(id);
    expect(after).toMatchObject({
      title: "Corrected",
      description: "New description",
      placeId: f.secondPlaceId,
      placeName: "Gym",
    });
    for (const field of [
      "imageStorageId",
      "checkOutImageStorageId",
      "checkInAt",
      "checkOutAt",
      "activityDate",
      "startTime",
      "endTime",
      "status",
      "completed",
    ] as const)
      expect(after?.[field]).toEqual(before?.[field]);
  },
);

test.each([
  { activityDate: "2000-01-01" },
  { startTime: "01:00" },
  { endTime: "22:00" },
  { completed: true },
])(
  "legacy edit arguments cannot change protected new fields: %j",
  async (patch) => {
    const f = await setup();
    const id = await f.checkIn();
    const before = await f.get(id);
    await expect(
      f.owner.mutation(api.coachActivities.update, {
        activityId: id,
        placeId: f.placeId,
        title: "Tampered",
        ...patch,
      }),
    ).rejects.toThrow();
    expect(await f.get(id)).toEqual(before);
  },
);

test("photos cannot be replaced through the legacy editor", async () => {
  const f = await setup();
  const id = await f.checkIn();
  const before = await f.get(id);
  await expect(
    f.owner.mutation(api.coachActivities.update, {
      activityId: id,
      placeId: f.placeId,
      title: "Tampered",
      imageStorageId: await f.image(),
    } as never),
  ).rejects.toThrow();
  expect(await f.get(id)).toEqual(before);
});

test("check-in and checkout reject caller-provided times at the API boundary", async () => {
  const f = await setup();
  const args = {
    coachId: f.coachId,
    placeId: f.placeId,
    title: "Test",
    imageStorageId: await f.image(),
    checkInAt: 1,
  };
  await expect(
    f.owner.mutation(api.coachActivities.checkIn, args as never),
  ).rejects.toThrow();
  const id = await f.checkIn();
  await expect(
    f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: await f.image(),
      checkOutAt: 1,
    } as never),
  ).rejects.toThrow();
  expect((await f.get(id))?.status).toBe("in_progress");
});

test.each(["otherCoach", "otherAdmin", "anonymous"] as const)(
  "%s cannot read, edit, close, delete or request uploads for another coach",
  async (actor) => {
    const f = await setup();
    const id = await f.checkIn();
    const client = actor === "anonymous" ? f.t : f[actor];
    const photo = await f.image();
    await expect(
      client.query(api.coachActivities.getById, { activityId: id }),
    ).rejects.toThrow();
    await expect(
      client.query(api.coachActivities.listOpenByCoach, {
        coachId: f.coachId,
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow();
    await expect(
      client.query(api.coachActivities.listHistoryByCoach, {
        coachId: f.coachId,
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow();
    await expect(
      client.mutation(api.coachActivities.update, {
        activityId: id,
        placeId: f.placeId,
        title: "Unauthorized",
      }),
    ).rejects.toThrow();
    await expect(
      client.mutation(api.coachActivities.checkOut, {
        activityId: id,
        imageStorageId: photo,
      }),
    ).rejects.toThrow();
    await expect(
      client.mutation(api.coachActivities.checkIn, {
        coachId: f.coachId,
        placeId: f.placeId,
        title: "Unauthorized",
        imageStorageId: photo,
      }),
    ).rejects.toThrow();
    await expect(
      client.mutation(api.coachActivities.remove, { activityId: id }),
    ).rejects.toThrow();
    await expect(
      client.mutation(api.coachActivities.generateUploadUrl, {
        coachId: f.coachId,
        activityId: id,
      }),
    ).rejects.toThrow();
    expect((await f.get(id))?.status).toBe("in_progress");
  },
);

test("an organization administrator can manage activities in the organization", async () => {
  const f = await setup();
  const id = await f.checkIn();
  await f.admin.mutation(api.coachActivities.update, {
    activityId: id,
    placeId: f.secondPlaceId,
    title: "Admin edit",
  });
  expect(
    await f.admin.query(api.coachActivities.getById, { activityId: id }),
  ).toMatchObject({ title: "Admin edit", updatedBy: f.adminId });
  await f.admin.mutation(api.coachActivities.remove, { activityId: id });
  expect(await f.get(id)).toBeNull();
});

test("inactive users cannot check in or operate their previous activity", async () => {
  const f = await setup();
  const id = await f.checkIn();
  await f.t.run((ctx) => ctx.db.patch("users", f.ownerId, { isActive: false }));
  await expect(f.checkIn()).rejects.toThrow("inactive");
  await expect(
    f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: await f.image(),
    }),
  ).rejects.toThrow("inactive");
  await expect(
    f.owner.mutation(api.coachActivities.remove, { activityId: id }),
  ).rejects.toThrow("inactive");
});

test("archived coaches cannot start activities but can finish an existing one", async () => {
  const f = await setup();
  const id = await f.checkIn();
  await f.admin.mutation(api.coaches.setArchived, {
    coachId: f.coachId,
    isArchived: true,
  });
  await expect(f.checkIn()).rejects.toThrow("Archived");
  await expect(
    f.owner.mutation(api.coachActivities.generateUploadUrl, {
      coachId: f.coachId,
    }),
  ).rejects.toThrow("Archived");
  expect(
    await f.owner.mutation(api.coachActivities.generateUploadUrl, {
      coachId: f.coachId,
      activityId: id,
    }),
  ).toEqual(expect.any(String));
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: await f.image(),
  });
  expect((await f.get(id))?.status).toBe("completed");
});

test("a place must be a place in the activity's program, including after reassignment", async () => {
  const f = await setup();
  await expect(f.checkIn({ placeId: f.otherPlaceId })).rejects.toThrow(
    "Invalid place",
  );
  await expect(f.checkIn({ placeId: f.positionId })).rejects.toThrow(
    "Invalid place",
  );
  const id = await f.checkIn();
  await f.t.run((ctx) =>
    ctx.db.patch("coaches", f.coachId, { programId: f.secondProgramId }),
  );
  await expect(
    f.owner.mutation(api.coachActivities.update, {
      activityId: id,
      placeId: f.secondProgramPlaceId,
      title: "Invalid move",
    }),
  ).rejects.toThrow("Invalid place");
  await f.owner.mutation(api.coachActivities.update, {
    activityId: id,
    placeId: f.secondPlaceId,
    title: "Old program",
  });
  expect((await f.get(id))?.programId).toBe(f.programId);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: await f.image(),
  });
});

test("blank titles fail on check-in and edit without changing the record", async () => {
  const f = await setup();
  await expect(f.checkIn({ title: "  " })).rejects.toThrow("Title is required");
  const id = await f.checkIn();
  await expect(
    f.owner.mutation(api.coachActivities.update, {
      activityId: id,
      placeId: f.placeId,
      title: "  ",
    }),
  ).rejects.toThrow("Title is required");
  expect((await f.get(id))?.title).toBe("Batting practice");
});

test.each([
  ["application/pdf", 10],
  ["image/jpeg", 0],
  ["image/jpeg", 5 * 1024 * 1024 + 1],
])(
  "invalid image type/size %s/%s is rejected on entry and exit",
  async (type, size) => {
    const f = await setup();
    const invalid = await f.image(type as string, size as number);
    await expect(f.checkIn({ imageStorageId: invalid })).rejects.toThrow(
      "valid JPG",
    );
    const id = await f.checkIn();
    await expect(
      f.owner.mutation(api.coachActivities.checkOut, {
        activityId: id,
        imageStorageId: invalid,
      }),
    ).rejects.toThrow("valid JPG");
    expect((await f.get(id))?.checkOutAt).toBeUndefined();
  },
);

test("missing images and reuse of an entry or exit image are rejected", async () => {
  const f = await setup();
  const missing = await f.image();
  await f.t.run((ctx) => ctx.storage.delete(missing));
  await expect(f.checkIn({ imageStorageId: missing })).rejects.toThrow(
    "valid JPG",
  );
  const id = await f.checkIn();
  const entryImage = (await f.get(id))!.imageStorageId;
  await expect(
    f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: entryImage,
    }),
  ).rejects.toThrow("already used");
  await expect(
    f.otherCoach.mutation(api.coachActivities.checkIn, {
      coachId: f.otherCoachId,
      placeId: f.placeId,
      title: "Reused photo",
      imageStorageId: entryImage,
    }),
  ).rejects.toThrow("already used");
  const exitImage = await f.image();
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: exitImage,
  });
  await expect(f.checkIn({ imageStorageId: exitImage })).rejects.toThrow(
    "already used for checkout",
  );
  const second = await f.checkIn();
  await expect(
    f.owner.mutation(api.coachActivities.checkOut, {
      activityId: second,
      imageStorageId: exitImage,
    }),
  ).rejects.toThrow("already used for checkout");
});

test("legacy records keep their fields and incomplete legacy records do not become open sessions", async () => {
  const f = await setup();
  const legacyId = await f.legacy(false);
  const before = await f.t.run((ctx) =>
    ctx.db.get("coachActivities", legacyId),
  );
  const newId = await f.checkIn();
  expect(
    await f.t.run((ctx) => ctx.db.get("coachActivities", legacyId)),
  ).toEqual(before);
  expect(await f.get(legacyId)).toMatchObject({
    activityDate: "2025-03-01",
    startTime: "08:00",
    endTime: "09:00",
    completed: false,
  });
  expect((await f.get(legacyId))?.checkInAt).toBeUndefined();
  const open = await f.owner.query(api.coachActivities.listOpenByCoach, {
    coachId: f.coachId,
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(open.page.map((r) => r._id)).toEqual([newId]);
  await expect(
    f.owner.mutation(api.coachActivities.checkOut, {
      activityId: legacyId,
      imageStorageId: await f.image(),
    }),
  ).rejects.toThrow("not open");
});

test("legacy editing updates metadata while preserving original times and photo", async () => {
  const f = await setup();
  const id = await f.legacy();
  const before = (await f.get(id))!;
  await f.owner.mutation(api.coachActivities.update, {
    activityId: id,
    placeId: f.secondPlaceId,
    title: "Manual edit",
    description: "Updated",
  });
  expect(await f.get(id)).toMatchObject({
    title: "Manual edit",
    placeName: "Gym",
    activityDate: before.activityDate,
    startTime: before.startTime,
    endTime: before.endTime,
    imageStorageId: before.imageStorageId,
    completed: before.completed,
  });
  await expect(
    f.owner.mutation(api.coachActivities.update, {
      activityId: id,
      placeId: f.placeId,
      title: "Tampered",
      activityDate: "2000-01-01",
    } as never),
  ).rejects.toThrow();
  expect(
    await f.t.run((ctx) =>
      ctx.db.system.get("_storage", before.imageStorageId),
    ),
  ).not.toBeNull();
});

test("list pages stay bounded and photo URLs are resolved only in the detail", async () => {
  const f = await setup();
  const first = await f.checkIn();
  vi.setSystemTime(now + 1);
  const second = await f.checkIn();
  vi.setSystemTime(now + 2);
  const third = await f.checkIn();
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: third,
    imageStorageId: await f.image(),
  });
  const open1 = await f.owner.query(api.coachActivities.listOpenByCoach, {
    coachId: f.coachId,
    paginationOpts: { numItems: 1, cursor: null },
  });
  const open2 = await f.owner.query(api.coachActivities.listOpenByCoach, {
    coachId: f.coachId,
    paginationOpts: { numItems: 1, cursor: open1.continueCursor },
  });
  expect(open1.page.map((row) => row._id)).toEqual([second]);
  expect(open2.page.map((row) => row._id)).toEqual([first]);
  expect(open1.isDone).toBe(false);
  expect(open2.isDone).toBe(true);
  const closed = await f.owner.query(api.coachActivities.listHistoryByCoach, {
    coachId: f.coachId,
    paginationOpts: { numItems: 1, cursor: null },
  });
  expect(closed.page.map((row) => row._id)).toEqual([third]);
  for (const row of [...open1.page, ...open2.page, ...closed.page]) {
    expect(row).not.toHaveProperty("imageUrl");
    expect(row).not.toHaveProperty("checkOutImageUrl");
  }
  expect(await f.get(third)).toMatchObject({
    imageUrl: expect.any(String),
    checkOutImageUrl: expect.any(String),
  });
});

test.each([false, true])(
  "coach can delete their own activity with checkout=%s and both photos are removed",
  async (closed) => {
    const f = await setup();
    const id = await f.checkIn();
    if (closed)
      await f.owner.mutation(api.coachActivities.checkOut, {
        activityId: id,
        imageStorageId: await f.image(),
      });
    const record = (await f.get(id))!;
    await f.owner.mutation(api.coachActivities.remove, { activityId: id });
    expect(await f.get(id)).toBeNull();
    expect(
      await f.t.run((ctx) =>
        ctx.db.system.get("_storage", record.imageStorageId),
      ),
    ).toBeNull();
    if (record.checkOutImageStorageId)
      expect(
        await f.t.run((ctx) =>
          ctx.db.system.get("_storage", record.checkOutImageStorageId!),
        ),
      ).toBeNull();
    await f.owner.mutation(api.coachActivities.remove, { activityId: id });
  },
);

test("orphan cleanup preserves both referenced photos and removes unused uploads", async () => {
  const f = await setup();
  const id = await f.checkIn();
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: await f.image(),
  });
  const record = (await f.get(id))!;
  const orphan = await f.image();
  vi.stubEnv("LEGACY_MIGRATION_SECRET", "test-secret");
  const result = await f.t.mutation(
    api.legacyMigration.cleanupOrphanedStorage,
    { secret: "test-secret", dryRun: false },
  );
  expect(result).toMatchObject({
    deletedStorageFiles: 1,
    referencedFromCoachActivities: 2,
  });
  expect(
    await f.t.run((ctx) =>
      ctx.db.system.get("_storage", record.imageStorageId),
    ),
  ).not.toBeNull();
  expect(
    await f.t.run((ctx) =>
      ctx.db.system.get("_storage", record.checkOutImageStorageId!),
    ),
  ).not.toBeNull();
  expect(
    await f.t.run((ctx) => ctx.db.system.get("_storage", orphan)),
  ).toBeNull();
});

test("deleting a coach removes entry and exit photos from all their activities", async () => {
  const f = await setup();
  const id = await f.checkIn();
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: await f.image(),
  });
  const record = (await f.get(id))!;
  expect(
    await f.admin.mutation(api.coaches.deleteLocal, { coachId: f.coachId }),
  ).toBe(true);
  expect(await f.t.run((ctx) => ctx.db.get("coachActivities", id))).toBeNull();
  expect(
    await f.t.run((ctx) =>
      ctx.db.system.get("_storage", record.imageStorageId),
    ),
  ).toBeNull();
  expect(
    await f.t.run((ctx) =>
      ctx.db.system.get("_storage", record.checkOutImageStorageId!),
    ),
  ).toBeNull();
});

test("a second device recovers open activities and a closed activity cannot be closed again", async () => {
  const f = await setup();
  const id = await f.checkIn();
  const secondDevice = f.t.withIdentity({ subject: "owner" });
  expect(
    (
      await secondDevice.query(api.coachActivities.listOpenByCoach, {
        coachId: f.coachId,
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).page.map((r) => r._id),
  ).toContain(id);
  await secondDevice.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: await f.image(),
  });
  await expect(
    f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: await f.image(),
    }),
  ).rejects.toThrow("not open");
});

test.each(["image/png", "image/webp"])(
  "captured image format %s is accepted",
  async (type) => {
    const f = await setup();
    const id = await f.checkIn({ imageStorageId: await f.image(type) });
    await f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: await f.image(type),
    });
    expect((await f.get(id))?.status).toBe("completed");
  },
);

test("checkout needs a photo and refuses a missing activity", async () => {
  const f = await setup();
  const id = await f.checkIn();
  await expect(
    f.owner.mutation(api.coachActivities.checkOut, { activityId: id } as never),
  ).rejects.toThrow();
  await f.owner.mutation(api.coachActivities.remove, { activityId: id });
  await expect(
    f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: await f.image(),
    }),
  ).rejects.toThrow("Activity not found");
});

test.each([
  { status: "completed" },
  { checkInAt: 0 },
  { checkOutAt: 0 },
  { timeZone: "UTC" },
])("update cannot change server-managed fields %j", async (patch) => {
  const f = await setup();
  const id = await f.checkIn();
  const before = await f.get(id);
  await expect(
    f.owner.mutation(api.coachActivities.update, {
      activityId: id,
      placeId: f.placeId,
      title: "Tampered",
      ...patch,
    } as never),
  ).rejects.toThrow();
  expect(await f.get(id)).toEqual(before);
});

test("summary reports activity count and total duration with coach authorization", async () => {
  const f = await setup();
  await f.legacy(true);
  const first = await f.checkIn();
  await f.checkIn();
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: first,
    imageStorageId: await f.image(),
  });
  expect(
    await f.owner.query(api.coachActivities.getSummary, {
      coachId: f.coachId,
    }),
  ).toEqual({ activityCount: 3, totalMinutes: 60 });
  await expect(
    f.otherCoach.query(api.coachActivities.getSummary, {
      coachId: f.coachId,
    }),
  ).rejects.toThrow();
});

test("history pages exclude every open activity and retain completed and incomplete earlier records", async () => {
  const f = await setup();
  const incomplete = await f.legacy(false);
  const completed = await f.legacy(true);
  const closed = await f.checkIn();
  for (let i = 0; i < 12; i += 1) await f.checkIn();
  const history = (cursor: string | null) =>
    f.owner.query(api.coachActivities.listHistoryByCoach, {
      coachId: f.coachId,
      paginationOpts: { numItems: 2, cursor },
    });
  expect((await history(null)).page.map((row) => row._id)).toEqual([
    completed,
    incomplete,
  ]);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: closed,
    imageStorageId: await f.image(),
  });
  const first = await history(null);
  expect(first.page.map((row) => row._id)).toEqual([closed, completed]);
  expect((await f.get(closed))?.checkOutImageUrl).toEqual(expect.any(String));
  expect(first.isDone).toBe(false);
  const second = await history(first.continueCursor);
  expect(second.page.map((row) => row._id)).toEqual([incomplete]);
  expect(second.page[0]).toMatchObject({
    completed: false,
    startTime: "08:00",
    endTime: "09:00",
  });
  expect(second.isDone).toBe(true);
  expect(
    (
      await f.admin.query(api.coachActivities.listHistoryByCoach, {
        coachId: f.coachId,
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).page,
  ).toHaveLength(3);
});

test("total time sums completed activities across pages, includes valid earlier records and updates after deletion", async () => {
  const f = await setup();
  await f.legacy(true);
  await f.legacy(false);
  for (let i = 0; i < 12; i += 1) await f.checkIn();
  const first = await f.checkIn();
  vi.setSystemTime(now + 35000);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: first,
    imageStorageId: await f.image(),
  });
  const second = await f.checkIn();
  vi.setSystemTime(now + 70000);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: second,
    imageStorageId: await f.image(),
  });
  const summary = () =>
    f.owner.query(api.coachActivities.getSummary, {
      coachId: f.coachId,
    });
  expect(await summary()).toMatchObject({
    activityCount: 16,
    totalMinutes: 61,
  });
  await f.owner.mutation(api.coachActivities.remove, { activityId: second });
  expect(await summary()).toMatchObject({
    activityCount: 15,
    totalMinutes: 60,
  });
});

test("total time measures actual elapsed time through daylight saving changes and overnight checkout", async () => {
  const f = await setup();
  vi.setSystemTime(Date.parse("2026-11-01T05:30:00Z"));
  const dst = await f.checkIn();
  vi.setSystemTime(Date.parse("2026-11-01T06:30:00Z"));
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: dst,
    imageStorageId: await f.image(),
  });
  vi.setSystemTime(Date.parse("2026-11-06T15:00:00Z"));
  const overnight = await f.checkIn();
  vi.setSystemTime(Date.parse("2026-11-07T16:15:00Z"));
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: overnight,
    imageStorageId: await f.image(),
  });
  expect(
    await f.owner.query(api.coachActivities.getSummary, {
      coachId: f.coachId,
    }),
  ).toMatchObject({ totalMinutes: 1575 });
});

test.each([
  [{ completed: true, startTime: "08:00", endTime: "08:00" }, 0],
  [{ completed: true, startTime: "08:00", endTime: "09:15" }, 4500000],
  [{ completed: true, startTime: "08:00:15", endTime: "08:01:45" }, 90000],
  [{ completed: false, startTime: "08:00", endTime: "09:00" }, null],
  [{ completed: true, startTime: "23:00", endTime: "01:00" }, null],
  [{ completed: true, startTime: "08:00" }, null],
  [{ completed: true, startTime: "25:00", endTime: "26:00" }, null],
  [{ completed: true, startTime: "08:00", endTime: "09:99" }, null],
  [{ completed: true, startTime: "08:00", checkInAt: 1000 }, null],
  [
    { completed: true, startTime: "08:00", checkInAt: 1000, checkOutAt: 500 },
    null,
  ],
])(
  "duration preserves missing and invalid evidence: %j",
  (activity, expected) => {
    expect(coachActivityDurationMs(activity)).toBe(expected);
  },
);

test("a coach completes the lifecycle from check-in through metadata editing, checkout and deletion", async () => {
  const f = await setup();
  const listArgs = {
    coachId: f.coachId,
    paginationOpts: { numItems: 10, cursor: null },
  };
  const summaryArgs = { coachId: f.coachId };
  const id = await f.checkIn();
  const entry = await f.get(id);
  expect(
    (
      await f.owner.query(api.coachActivities.listOpenByCoach, listArgs)
    ).page.map((row) => row._id),
  ).toEqual([id]);
  expect(
    (await f.owner.query(api.coachActivities.listHistoryByCoach, listArgs))
      .page,
  ).toHaveLength(0);
  await f.owner.mutation(api.coachActivities.update, {
    activityId: id,
    title: "Practice updated",
    description: "Coordination",
    placeId: f.placeId,
  });
  vi.setSystemTime(now + 90 * 60000);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: id,
    imageStorageId: await f.image(),
  });
  expect(
    (await f.owner.query(api.coachActivities.listOpenByCoach, listArgs)).page,
  ).toHaveLength(0);
  expect(
    (await f.owner.query(api.coachActivities.listHistoryByCoach, listArgs))
      .page,
  ).toMatchObject([
    { _id: id, title: "Practice updated", status: "completed" },
  ]);
  expect(await f.get(id)).toMatchObject({
    description: "Coordination",
    checkInAt: entry!.checkInAt,
    imageStorageId: entry!.imageStorageId,
    imageUrl: expect.any(String),
    checkOutImageUrl: expect.any(String),
  });
  expect(
    await f.owner.query(api.coachActivities.getSummary, summaryArgs),
  ).toMatchObject({ activityCount: 1, totalMinutes: 90 });
  await f.owner.mutation(api.coachActivities.remove, { activityId: id });
  expect(await f.get(id)).toBeNull();
  expect(
    (await f.owner.query(api.coachActivities.listHistoryByCoach, listArgs))
      .page,
  ).toHaveLength(0);
  expect(
    await f.owner.query(api.coachActivities.getSummary, summaryArgs),
  ).toEqual({ activityCount: 0, totalMinutes: 0 });
});

test("list durations are computed without storing them and distinguish unknown legacy durations", async () => {
  const f = await setup();
  const validLegacy = await f.legacy(true);
  const incompleteLegacy = await f.legacy(false);
  const invalidLegacy = await f.legacy(true);
  await f.t.run((ctx) =>
    ctx.db.patch("coachActivities", invalidLegacy, { endTime: "07:00" }),
  );
  const closed = await f.checkIn();
  const open = await f.checkIn();
  vi.setSystemTime(now + 35000);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: closed,
    imageStorageId: await f.image(),
  });
  const args = {
    coachId: f.coachId,
    paginationOpts: { numItems: 10, cursor: null },
  };
  const history = await f.owner.query(
    api.coachActivities.listHistoryByCoach,
    args,
  );
  const durations = new Map(
    history.page.map((row) => [row._id, row.durationMs]),
  );
  expect(durations.get(closed)).toBe(35000);
  expect(durations.get(validLegacy)).toBe(3600000);
  expect(durations.get(incompleteLegacy)).toBeNull();
  expect(durations.get(invalidLegacy)).toBeNull();
  expect(
    (await f.owner.query(api.coachActivities.listOpenByCoach, args)).page,
  ).toMatchObject([{ _id: open, durationMs: null }]);
  expect(
    await f.t.run((ctx) => ctx.db.get("coachActivities", closed)),
  ).not.toHaveProperty("durationMs");
  expect(
    await f.owner.query(api.coachActivities.getSummary, {
      coachId: f.coachId,
    }),
  ).toMatchObject({ totalMinutes: 60 });
});

test("indexed sorting orders the whole coach list before pagination and keeps other coaches isolated", async () => {
  const f = await setup();
  const ids = [];
  for (const [i, title] of ["Zulu", "alpha", "Beta"].entries()) {
    vi.setSystemTime(now + i * 60000);
    ids.push(await f.checkIn({ title }));
  }
  const query = (cursor: string | null, direction: "asc" | "desc" = "asc") =>
    f.owner.query(api.coachActivities.listOpenByCoach, {
      coachId: f.coachId,
      sort: { field: "title", direction },
      paginationOpts: { numItems: 1, cursor },
    });
  const first = await query(null);
  const second = await query(first.continueCursor);
  const third = await query(second.continueCursor);
  expect([first, second, third].map((page) => page.page[0]._id)).toEqual([
    ids[1],
    ids[2],
    ids[0],
  ]);
  expect(third.isDone).toBe(true);
  expect((await query(null, "desc")).page[0]._id).toBe(ids[0]);
  expect(first.page[0]).not.toHaveProperty("listing");
  await expect(
    f.otherCoach.query(api.coachActivities.listOpenByCoach, {
      coachId: f.coachId,
      sort: { field: "title", direction: "asc" },
      paginationOpts: { numItems: 1, cursor: null },
    }),
  ).rejects.toThrow();
  await expect(
    f.owner.query(api.coachActivities.listOpenByCoach, {
      coachId: f.coachId,
      sort: { field: "duration", direction: "asc" },
      paginationOpts: { numItems: 1, cursor: null },
    } as never),
  ).rejects.toThrow();
});

test("metadata edits update title and place ordering without changing the recorded evidence", async () => {
  const f = await setup();
  const first = await f.checkIn({ title: "Alpha", placeId: f.secondPlaceId });
  vi.setSystemTime(now + 60000);
  const second = await f.checkIn({ title: "Beta" });
  const evidence = await f.get(first);
  const query = (
    field: "placeName" | "title" | "checkIn",
    direction: "asc" | "desc" = "asc",
  ) =>
    f.owner.query(api.coachActivities.listOpenByCoach, {
      coachId: f.coachId,
      sort: { field, direction },
      paginationOpts: { numItems: 1, cursor: null },
    });
  expect((await query("placeName")).page[0]._id).toBe(second);
  expect((await query("title")).page[0]._id).toBe(first);
  expect((await query("checkIn")).page[0]._id).toBe(first);
  expect((await query("checkIn", "desc")).page[0]._id).toBe(second);
  await f.owner.mutation(api.coachActivities.update, {
    activityId: first,
    title: "zulu",
    placeId: f.placeId,
  });
  expect((await query("title")).page[0]._id).toBe(second);
  expect(await f.get(first)).toMatchObject({
    checkInAt: evidence!.checkInAt,
    imageStorageId: evidence!.imageStorageId,
  });
  expect(await f.get(first)).not.toHaveProperty("listing");
});

test("checkout sorting uses the actual checkout day and keeps legacy records with their original times", async () => {
  const f = await setup();
  const earlier = await f.legacy(false);
  const first = await f.checkIn();
  vi.setSystemTime(Date.parse("2026-11-07T03:00:00Z"));
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: first,
    imageStorageId: await f.image(),
  });
  const second = await f.checkIn();
  vi.setSystemTime(Date.parse("2026-11-07T05:01:00Z"));
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: second,
    imageStorageId: await f.image(),
  });
  const open = await f.checkIn();
  await f.t.mutation(internal.coachActivityMigrations.backfillListing, {
    cursor: null,
    dryRun: false,
  });
  const firstPage = await f.owner.query(
    api.coachActivities.listHistoryByCoach,
    {
      coachId: f.coachId,
      sort: { field: "checkOut", direction: "desc" },
      paginationOpts: { numItems: 1, cursor: null },
    },
  );
  expect(firstPage.page[0]._id).toBe(second);
  const secondPage = await f.owner.query(
    api.coachActivities.listHistoryByCoach,
    {
      coachId: f.coachId,
      sort: { field: "checkOut", direction: "desc" },
      paginationOpts: { numItems: 1, cursor: firstPage.continueCursor },
    },
  );
  expect(secondPage.page[0]._id).toBe(first);
  const thirdPage = await f.owner.query(
    api.coachActivities.listHistoryByCoach,
    {
      coachId: f.coachId,
      sort: { field: "checkOut", direction: "desc" },
      paginationOpts: { numItems: 1, cursor: secondPage.continueCursor },
    },
  );
  expect(thirdPage.page[0]).toMatchObject({
    _id: earlier,
    completed: false,
    startTime: "08:00",
    endTime: "09:00",
  });
  const openPage = await f.owner.query(api.coachActivities.listOpenByCoach, {
    coachId: f.coachId,
    sort: { field: "title", direction: "asc" },
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(openPage.page.map((activity) => activity._id)).toEqual([open]);
});

test("the listing backfill is bounded, supports dry runs and preserves original records", async () => {
  const f = await setup();
  const id = await f.legacy(false);
  const before = await f.t.run((ctx) => ctx.db.get("coachActivities", id));
  for (let i = 0; i < 100; i += 1) await f.legacy(true);
  const dry = await f.t.mutation(
    internal.coachActivityMigrations.backfillListing,
    { cursor: null, dryRun: true },
  );
  expect(dry).toMatchObject({ processed: 100, isDone: false });
  expect(await f.t.run((ctx) => ctx.db.get("coachActivities", id))).toEqual(
    before,
  );
  const first = await f.t.mutation(
    internal.coachActivityMigrations.backfillListing,
    { cursor: null, dryRun: false },
  );
  const last = await f.t.mutation(
    internal.coachActivityMigrations.backfillListing,
    { cursor: first.continueCursor, dryRun: false },
  );
  expect(last).toMatchObject({ processed: 1, isDone: true });
  const after = (await f.t.run((ctx) => ctx.db.get("coachActivities", id)))!;
  expect(after).toMatchObject({
    ...before,
    listing: {
      group: "history",
      title: "manual activity",
      place: "field",
      checkInOrder: Date.parse("2025-03-01T13:00:00Z"),
      checkOutOrder: Date.parse("2025-03-01T14:00:00Z"),
    },
  });
  expect(after.status).toBeUndefined();
  expect(after.checkInAt).toBeUndefined();
  expect(after).not.toHaveProperty("durationMs");
  await f.t.mutation(internal.coachActivityMigrations.backfillListing, {
    cursor: null,
    dryRun: false,
  });
  expect(await f.t.run((ctx) => ctx.db.get("coachActivities", id))).toEqual(
    after,
  );
});

test("date sorting preserves the order of real instants when Poinciana repeats an hour", async () => {
  const f = await setup();
  const ids = [];
  for (const time of ["2026-11-01T05:50:00Z", "2026-11-01T06:10:00Z"]) {
    vi.setSystemTime(Date.parse(time));
    const id = await f.checkIn();
    ids.push(id);
    vi.setSystemTime(Date.parse(time) + 60000);
    await f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: await f.image(),
    });
  }
  for (const field of ["checkIn", "checkOut"] as const) {
    const page = await f.owner.query(api.coachActivities.listHistoryByCoach, {
      coachId: f.coachId,
      sort: { field, direction: "desc" },
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page.map((row) => row._id)).toEqual([ids[1], ids[0]]);
  }
});

test.each([
  ["2026-01-15", "10:00", "2026-01-15T15:00:00Z"],
  ["2026-07-15", "10:00", "2026-07-15T14:00:00Z"],
  ["2026-11-06", "00:00", "2026-11-06T05:00:00Z"],
  ["2026-07-15", "10:00:45", "2026-07-15T14:00:45Z"],
  ["2026-11-01", "01:30", "2026-11-01T05:30:00Z"],
  ["2026-03-08", "01:30", "2026-03-08T06:30:00Z"],
  ["2026-03-08", "03:30", "2026-03-08T07:30:00Z"],
  ["2026-03-08", "02:30", null],
  ["2026-02-30", "10:00", null],
  ["2025-02-29", "10:00", null],
  ["2024-02-29", "10:00", "2024-02-29T15:00:00Z"],
  ["2026-01-15", "24:00", null],
  ["2026-01-15", "10:99", null],
  ["2026-01-15", undefined, null],
  ["invalid", "10:00", null],
])("legacy Poinciana clock %s %s resolves to %s", (date, time, expected) => {
  expect(legacyActivityTimestamp(date, time)).toBe(
    expected === null ? null : Date.parse(expected),
  );
});

test.each(["checkIn", "checkOut"] as const)(
  "mixed legacy and new records sort correctly by %s across pages",
  async (field) => {
    const f = await setup();
    const legacy = await f.legacy(true);
    await f.t.run((ctx) =>
      ctx.db.patch("coachActivities", legacy, {
        activityDate: "2026-11-06",
        startTime: "17:00",
        endTime: "18:00",
      }),
    );
    const current = await f.checkIn({ title: "Current 10am" });
    vi.setSystemTime(now + 3600000);
    await f.owner.mutation(api.coachActivities.checkOut, {
      activityId: current,
      imageStorageId: await f.image(),
    });
    const original = await f.get(legacy);
    const summaryBefore = await f.owner.query(api.coachActivities.getSummary, {
      coachId: f.coachId,
    });
    await f.t.mutation(internal.coachActivityMigrations.backfillListing, {
      cursor: null,
      dryRun: false,
    });
    for (const direction of ["asc", "desc"] as const) {
      const query = (cursor: string | null) =>
        f.owner.query(api.coachActivities.listHistoryByCoach, {
          coachId: f.coachId,
          sort: { field, direction },
          paginationOpts: { numItems: 1, cursor },
        });
      const first = await query(null);
      const last = await query(first.continueCursor);
      expect([first.page[0]._id, last.page[0]._id]).toEqual(
        direction === "asc" ? [current, legacy] : [legacy, current],
      );
      expect(last.isDone).toBe(true);
    }
    expect(await f.get(legacy)).toEqual(original);
    expect(
      await f.owner.query(api.coachActivities.getSummary, {
        coachId: f.coachId,
      }),
    ).toEqual(summaryBefore);
    const stored = (await f.t.run((ctx) =>
      ctx.db.get("coachActivities", legacy),
    ))!;
    expect(stored.checkInAt).toBeUndefined();
    expect(stored.checkOutAt).toBeUndefined();
    expect(stored.listing).not.toHaveProperty("checkOutDate");
  },
);

test("normalizing legacy timestamps preserves historical duration rules and incomplete evidence", async () => {
  const f = await setup();
  const ids = [
    await f.legacy(true),
    await f.legacy(true),
    await f.legacy(false),
  ];
  await f.t.run(async (ctx) => {
    await ctx.db.patch("coachActivities", ids[0], {
      activityDate: "2026-03-08",
      startTime: "01:30",
      endTime: "03:30",
    });
    await ctx.db.patch("coachActivities", ids[1], {
      startTime: "23:00",
      endTime: "01:00",
    });
  });
  const before = await f.owner.query(api.coachActivities.getSummary, {
    coachId: f.coachId,
  });
  await f.t.mutation(internal.coachActivityMigrations.backfillListing, {
    cursor: null,
    dryRun: false,
  });
  const history = await f.owner.query(api.coachActivities.listHistoryByCoach, {
    coachId: f.coachId,
    sort: { field: "checkIn", direction: "asc" },
    paginationOpts: { numItems: 10, cursor: null },
  });
  const durations = new Map(
    history.page.map((activity) => [activity._id, activity.durationMs]),
  );
  expect(durations.get(ids[0])).toBe(2 * 3600000);
  expect(durations.get(ids[1])).toBeNull();
  expect(durations.get(ids[2])).toBeNull();
  expect(
    await f.owner.query(api.coachActivities.getSummary, { coachId: f.coachId }),
  ).toEqual(before);
});

const novemberPeriod = { from: "2026-11-01", to: "2026-11-30" };

test("period queries enforce coach access and validate real inclusive dates", async () => {
  const f = await setup();
  const args = { coachId: f.coachId, range: novemberPeriod };
  for (const client of [f.t, f.otherCoach, f.otherAdmin]) {
    await expect(
      client.query(api.coachActivities.getPeriodByCoach, args),
    ).rejects.toThrow();
  }
  for (const range of [
    { from: "2026-02-29", to: "2026-03-01" },
    { from: "2026-11-02", to: "2026-11-01" },
    { from: "bad", to: "2026-11-30" },
  ]) {
    await expect(
      f.owner.query(api.coachActivities.getPeriodByCoach, { ...args, range }),
    ).rejects.toThrow("Invalid activity date range");
  }
  expect(
    await f.admin.query(api.coachActivities.getPeriodByCoach, args),
  ).toMatchObject({
    status: "ready",
    activities: [],
    summary: { activityCount: 0, totalDurationMs: 0 },
  });
});

test("period totals use all rows, preserve milliseconds and update after checkout and deletion", async () => {
  const f = await setup();
  // All intervals are disjoint; each is shorter than a minute.
  for (let i = 0; i < 12; i++) {
    vi.setSystemTime(now + i * 60000);
    const id = await f.checkIn({ title: `Activity ${i}` });
    vi.setSystemTime(now + i * 60000 + 30001);
    await f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: await f.image(),
    });
  }
  const pending = await f.checkIn();
  const period = () =>
    f.owner.query(api.coachActivities.getPeriodByCoach, {
      coachId: f.coachId,
      range: novemberPeriod,
    });
  const result = await period();
  expect(result).toMatchObject({
    status: "ready",
    summary: {
      activityCount: 13,
      totalDurationMs: 360012,
      pendingCount: 1,
      unknownDurationCount: 0,
    },
  });
  if (result.status !== "ready") throw Error("Expected period");
  expect(result.activities).toHaveLength(13);
  expect(result.activities[0]).not.toHaveProperty("listing");
  expect(result.activities[0]).not.toHaveProperty("imageUrl");
  vi.setSystemTime(now + 12 * 60000);
  await f.owner.mutation(api.coachActivities.checkOut, {
    activityId: pending,
    imageStorageId: await f.image(),
  });
  expect(await period()).toMatchObject({
    summary: { pendingCount: 0, totalDurationMs: 390011 },
  });
  await f.owner.mutation(api.coachActivities.remove, { activityId: pending });
  expect(await period()).toMatchObject({
    summary: { activityCount: 12, totalDurationMs: 360012 },
  });
});

test("entry date includes both endpoints, credits overnight duration fully and isolates other coaches", async () => {
  const f = await setup();
  for (const date of ["2026-10-31", "2026-11-01", "2026-11-30", "2026-12-01"]) {
    vi.setSystemTime(legacyActivityTimestamp(date, "23:00")!);
    const id = await f.checkIn({ title: date });
    vi.setSystemTime(Date.now() + 7200000);
    await f.owner.mutation(api.coachActivities.checkOut, {
      activityId: id,
      imageStorageId: await f.image(),
    });
  }
  await f.otherCoach.mutation(api.coachActivities.checkIn, {
    coachId: f.otherCoachId,
    placeId: f.placeId,
    title: "Other coach",
    imageStorageId: await f.image(),
  });
  const result = await f.owner.query(api.coachActivities.getPeriodByCoach, {
    coachId: f.coachId,
    range: novemberPeriod,
  });
  expect(result).toMatchObject({
    status: "ready",
    summary: { activityCount: 2, totalDurationMs: 14400000 },
  });
  if (result.status !== "ready") throw Error("Expected period");
  expect(result.activities.map((row) => row.title)).toEqual([
    "2026-11-01",
    "2026-11-30",
  ]);
  expect(result.summary).not.toHaveProperty("reviewCount");
  expect(result.activities.every((row) => !("reviewIssues" in row))).toBe(true);
});

test("overlapping legacy records retain full canonical durations and distinguish zero from unknown", async () => {
  const f = await setup();
  const ids: Id<"coachActivities">[] = [];
  for (const [startTime, endTime, completed] of [
    ["08:00", "12:00", true],
    ["09:00", "10:00", true],
    ["10:00", "11:00", true],
    ["12:00", "12:00", true],
    ["invalid", "13:00", true],
    ["13:00", "14:00", false],
  ] as const) {
    const id = await f.legacy(completed);
    await f.t.run((ctx) =>
      ctx.db.patch("coachActivities", id, { startTime, endTime }),
    );
    ids.push(id);
  }
  const result = await f.owner.query(api.coachActivities.getPeriodByCoach, {
    coachId: f.coachId,
    range: { from: "2025-03-01", to: "2025-03-01" },
  });
  expect(result).toMatchObject({
    status: "ready",
    summary: {
      activityCount: 6,
      totalDurationMs: 21600000,
      pendingCount: 0,
      unknownDurationCount: 2,
    },
  });
  if (result.status !== "ready") throw Error("Expected period");
  expect(
    result.activities
      .filter((row) => row.durationMs !== null)
      .map((row) => row.durationMs),
  ).toEqual([14400000, 3600000, 3600000, 0]);
  expect(result.activities.find((row) => row._id === ids[3])).toMatchObject({
    durationMs: 0,
  });
  for (const id of ids.slice(4))
    expect(result.activities.find((row) => row._id === id)).toMatchObject({
      durationMs: null,
    });
});

test("excessive periods never return partial totals", async () => {
  const f = await setup();
  const first = await f.legacy(true);
  const second = await f.legacy(true);
  await f.t.run((ctx) =>
    ctx.db.patch("coachActivities", second, {
      startTime: "09:00",
      endTime: "10:00",
    }),
  );
  const args = {
    coachId: f.coachId,
    range: { from: "2025-03-01", to: "2025-03-01" },
  };
  expect(
    await f.owner.query(api.coachActivities.getPeriodByCoach, args),
  ).toMatchObject({ summary: { activityCount: 2, totalDurationMs: 7200000 } });
  await f.t.run(async (ctx) => {
    const original = await ctx.db.get("coachActivities", first);
    if (!original) throw Error("Missing fixture");
    const { _id, _creationTime, ...data } = original;
    void _id;
    void _creationTime;
    for (let i = 0; i < 998; i++) await ctx.db.insert("coachActivities", data);
  });
  expect(
    await f.owner.query(api.coachActivities.getPeriodByCoach, args),
  ).toMatchObject({ status: "ready", summary: { activityCount: 1000 } });
  await f.t.run(async (ctx) => {
    const original = await ctx.db.get("coachActivities", first);
    if (!original) throw Error("Missing fixture");
    const { _id, _creationTime, ...data } = original;
    void _id;
    void _creationTime;
    await ctx.db.insert("coachActivities", data);
  });
  expect(
    await f.owner.query(api.coachActivities.getPeriodByCoach, args),
  ).toEqual({ status: "limitExceeded" });
});
