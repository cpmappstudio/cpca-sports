/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { DEFAULT_APPLICATION_COLUMNS } from "../lib/applications/table-fields";
import type { ProgramFormDefinition } from "../components/sections/shell/programs/create/form-builder/types";

const modules = import.meta.glob("./**/*.ts");
function form(withContract = true): ProgramFormDefinition {
  return {
    version: 1,
    isMultiStep: false,
    steps: [
      {
        id: "athlete",
        title: "Athlete",
        icon: "athlete",
        elements: [
          {
            id: "needs-i20",
            name: "needsI20",
            label: "I-20",
            fieldType: "Select",
            options: [
              { id: "transfer", value: "yes-transfer", label: "Transfer I-20" },
            ],
          },
          {
            id: "score",
            name: "score",
            label: "Score",
            fieldType: "Input",
            inputType: "number",
          },
          {
            id: "consent",
            name: "consent",
            label: "Consent",
            fieldType: "Checkbox",
          },
          {
            id: "birth-date",
            name: "birthDate",
            label: "Birth Date",
            fieldType: "DatePicker",
            mode: "single",
          },
          {
            id: "attendance",
            name: "attendance",
            label: "Attendance",
            fieldType: "DatePicker",
            mode: "range",
          },
          ...(withContract
            ? [
                {
                  id: "contract",
                  name: "select_a8f3",
                  label: "Contract",
                  fieldType: "Select" as const,
                  options: [{ id: "yes", value: "YES", label: "Signed" }],
                },
              ]
            : []),
        ],
      },
    ],
  };
}

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", {
      clerkId: "admin",
      firstName: "Admin",
      lastName: "One",
      email: "admin@example.com",
      isActive: true,
      isSuperAdmin: false,
    });
    const colleagueId = await ctx.db.insert("users", {
      clerkId: "colleague",
      firstName: "Admin",
      lastName: "Two",
      email: "colleague@example.com",
      isActive: true,
      isSuperAdmin: false,
    });
    const memberId = await ctx.db.insert("users", {
      clerkId: "member",
      firstName: "Member",
      lastName: "User",
      email: "member@example.com",
      isActive: true,
      isSuperAdmin: false,
    });
    const organizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "org",
      slug: "school",
      name: "School",
      createdAt: 1,
    });
    const otherOrganizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "other-org",
      slug: "other",
      name: "Other",
      createdAt: 1,
    });
    for (const [userId, role] of [
      [adminId, "admin"],
      [colleagueId, "admin"],
      [memberId, "member"],
    ] as const) {
      await ctx.db.insert("organizationMembers", {
        userId,
        organizationId,
        role,
        clerkMembershipId: String(userId),
        createdAt: 1,
      });
    }
    await ctx.db.insert("organizationMembers", {
      userId: adminId,
      organizationId: otherOrganizationId,
      role: "admin",
      clerkMembershipId: "other-membership",
      createdAt: 1,
    });
    const program = (
      name: string,
      definition: ProgramFormDefinition,
      orgId = organizationId,
    ) =>
      ctx.db.insert("programs", {
        organizationId: orgId,
        name,
        isDraft: false,
        formDefinition: JSON.stringify(definition),
        createdBy: adminId,
        createdAt: 1,
        updatedAt: 1,
      });
    const soccerId = await program("Soccer", form());
    await program("Basketball", form());
    const baseballId = await program("Baseball PR", form(false));
    const privateForm = form();
    privateForm.steps[0].elements.push({
      id: "private",
      name: "private",
      label: "Private field",
      fieldType: "Input",
      inputType: "text",
    });
    await program("Private program", privateForm, otherOrganizationId);
    const application = (
      programId: typeof soccerId,
      code: string,
      formData: { athlete: Record<string, string | number | boolean> },
      snapshot?: ProgramFormDefinition,
      isArchived = false,
    ) =>
      ctx.db.insert("applications", {
        userId: memberId,
        organizationId,
        programId,
        applicationCode: code,
        status: "pending",
        isArchived,
        formData,
        ...(snapshot
          ? { formDefinitionSnapshot: JSON.stringify(snapshot) }
          : {}),
      });
    const applicationId = await application(
      soccerId,
      "ANSWERED",
      {
        athlete: {
          firstName: "Student",
          select_a8f3: "YES",
          needsI20: "yes-transfer",
          score: 0,
          consent: false,
        },
      },
      form(),
    );
    await application(
      soccerId,
      "UNANSWERED",
      { athlete: { firstName: "Older student" } },
      form(false),
    );
    await application(baseballId, "NOT-APPLICABLE", {
      athlete: { firstName: "Baseball student" },
    });
    await application(
      soccerId,
      "ARCHIVED",
      { athlete: { firstName: "Archived student", select_a8f3: "YES" } },
      form(),
      true,
    );
    return { applicationId, soccerId, organizationId, memberId };
  });
  return {
    t,
    admin: t.withIdentity({ subject: "admin" }),
    colleague: t.withIdentity({ subject: "colleague" }),
    member: t.withIdentity({ subject: "member" }),
    ...ids,
  };
}

test("table defaults preserve existing columns and merge only equivalent fields in this organization", async () => {
  const { admin } = await setup();
  const configuration = await admin.query(
    api.applications.getTableConfiguration,
    { organizationSlug: "school" },
  );
  expect(configuration.visibleColumns).toEqual(DEFAULT_APPLICATION_COLUMNS);
  const contracts = configuration.fields.filter(
    (field) => field.label === "Contract",
  );
  expect(contracts).toHaveLength(1);
  expect(contracts[0].programs).toEqual(["Basketball", "Soccer"]);
  expect(
    configuration.fields.some((field) => field.label === "Private field"),
  ).toBe(false);
  const rows = await admin.query(api.applications.listByOrganizationSummary, {
    organizationSlug: "school",
  });
  expect(rows.every((row) => row.formValues === undefined)).toBe(true);
});

test("selected fields are projected in one list with distinct missing and non-applicable values", async () => {
  const { t, admin, applicationId, soccerId } = await setup();
  const before = await t.run((ctx) =>
    ctx.db.get("applications", applicationId),
  );
  const configuration = await admin.query(
    api.applications.getTableConfiguration,
    { organizationSlug: "school" },
  );
  const field = (label: string) =>
    configuration.fields.find((field) => field.label === label)!.id;
  const ids = [
    field("Contract"),
    field("I-20"),
    field("Score"),
    field("Consent"),
  ];
  await admin.mutation(api.applications.setTableColumns, {
    organizationSlug: "school",
    visibleColumns: ["fullName", ...ids],
  });
  const rows = await admin.query(api.applications.listByOrganizationSummary, {
    organizationSlug: "school",
  });
  const answered = rows.find((row) => row.applicationCode === "ANSWERED")!;
  expect(answered.formValues).toEqual({
    [ids[0]]: "Signed",
    [ids[1]]: "Transfer I-20",
    [ids[2]]: 0,
    [ids[3]]: false,
  });
  expect(
    rows.find((row) => row.applicationCode === "UNANSWERED")?.formValues?.[
      ids[0]
    ],
  ).toBeNull();
  expect(
    rows.find((row) => row.applicationCode === "NOT-APPLICABLE")?.formValues?.[
      ids[0]
    ],
  ).toBe("—");
  const archived = await admin.query(
    api.applications.listByOrganizationSummary,
    { organizationSlug: "school", isArchived: true },
  );
  expect(archived).toHaveLength(1);
  expect(archived[0].formValues?.[ids[0]]).toBe("Signed");
  expect(
    await t.run((ctx) => ctx.db.get("applications", applicationId)),
  ).toEqual(before);
  const updated = form();
  const contract = updated.steps[0].elements.find(
    (field) => field.id === "contract",
  );
  if (contract?.fieldType === "Select")
    contract.options[0].label = "Changed label";
  await t.run((ctx) =>
    ctx.db.patch("programs", soccerId, {
      formDefinition: JSON.stringify(updated),
    }),
  );
  const after = await admin.query(api.applications.listByOrganizationSummary, {
    organizationSlug: "school",
  });
  expect(
    after.find((row) => row.applicationCode === "ANSWERED")?.formValues?.[
      ids[0]
    ],
  ).toBe("Signed");
});

test("preferences persist independently for each user and organization and allow an empty selection", async () => {
  const { t, admin, colleague } = await setup();
  await admin.mutation(api.applications.setTableColumns, {
    organizationSlug: "school",
    visibleColumns: ["fullName"],
  });
  await admin.mutation(api.applications.setTableColumns, {
    organizationSlug: "school",
    visibleColumns: [],
  });
  expect(
    (
      await admin.query(api.applications.getTableConfiguration, {
        organizationSlug: "school",
      })
    ).visibleColumns,
  ).toEqual([]);
  expect(
    (
      await colleague.query(api.applications.getTableConfiguration, {
        organizationSlug: "school",
      })
    ).visibleColumns,
  ).toEqual(DEFAULT_APPLICATION_COLUMNS);
  expect(
    (
      await admin.query(api.applications.getTableConfiguration, {
        organizationSlug: "other",
      })
    ).visibleColumns,
  ).toEqual(DEFAULT_APPLICATION_COLUMNS);
  expect(
    await t.run(
      async (ctx) =>
        (await ctx.db.query("applicationTablePreferences").take(10)).length,
    ),
  ).toBe(1);
});

test("members cannot read administrative columns or modify table preferences", async () => {
  const { member, colleague } = await setup();
  await expect(
    member.query(api.applications.getTableConfiguration, {
      organizationSlug: "school",
    }),
  ).rejects.toThrow("Admin access required");
  await expect(
    member.mutation(api.applications.setTableColumns, {
      organizationSlug: "school",
      visibleColumns: [],
    }),
  ).rejects.toThrow("Admin access required");
  await expect(
    colleague.query(api.applications.getTableConfiguration, {
      organizationSlug: "other",
    }),
  ).rejects.toThrow("access");
});

test.each([["unknown"], ["fullName", "fullName"]])(
  "invalid or duplicate column selections are rejected: %j",
  async (...visibleColumns) => {
    const { admin } = await setup();
    await expect(
      admin.mutation(api.applications.setTableColumns, {
        organizationSlug: "school",
        visibleColumns,
      }),
    ).rejects.toThrow("Invalid application table columns");
    expect(
      (
        await admin.query(api.applications.getTableConfiguration, {
          organizationSlug: "school",
        })
      ).visibleColumns,
    ).toEqual(DEFAULT_APPLICATION_COLUMNS);
  },
);

test("hidden fields are omitted from subsequent table results", async () => {
  const { admin } = await setup();
  const configuration = await admin.query(
    api.applications.getTableConfiguration,
    { organizationSlug: "school" },
  );
  const contract = configuration.fields.find(
    (field) => field.label === "Contract",
  )!.id;
  await admin.mutation(api.applications.setTableColumns, {
    organizationSlug: "school",
    visibleColumns: ["fullName", contract],
  });
  await admin.mutation(api.applications.setTableColumns, {
    organizationSlug: "school",
    visibleColumns: ["fullName"],
  });
  const rows = await admin.query(api.applications.listByOrganizationSummary, {
    organizationSlug: "school",
  });
  expect(rows.every((row) => row.formValues === undefined)).toBe(true);
});

test("date columns include chronological sort values without replacing the displayed dates", async () => {
  const { t, admin, applicationId } = await setup();
  await t.run(async (ctx) => {
    const application = (await ctx.db.get("applications", applicationId))!;
    await ctx.db.patch("applications", applicationId, {
      formData: {
        ...application.formData,
        athlete: {
          ...application.formData.athlete,
          birthDate: "2026-12-31",
          attendance: JSON.stringify({ from: "2026-02-01", to: "2026-03-01" }),
        },
      },
    });
  });
  const configuration = await admin.query(
    api.applications.getTableConfiguration,
    { organizationSlug: "school" },
  );
  const birthDate = configuration.fields.find(
    (field) => field.label === "Birth Date",
  )!.id;
  const attendance = configuration.fields.find(
    (field) => field.label === "Attendance",
  )!.id;
  await admin.mutation(api.applications.setTableColumns, {
    organizationSlug: "school",
    visibleColumns: ["fullName", birthDate, attendance],
  });
  const rows = await admin.query(api.applications.listByOrganizationSummary, {
    organizationSlug: "school",
  });
  const answered = rows.find((row) => row.applicationCode === "ANSWERED")!;
  expect(answered.formValues?.[birthDate]).toBe("Dec 31, 2026");
  expect(answered.formValues?.[attendance]).toBe("Feb 1, 2026 – Mar 1, 2026");
  expect(answered.formSortValues).toEqual({
    [birthDate]: new Date(2026, 11, 31).getTime(),
    [attendance]: new Date(2026, 1, 1).getTime(),
  });
});
