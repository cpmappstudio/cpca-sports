import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import {
  DEFAULT_APPLICATION_COLUMNS,
  buildApplicationFieldCatalog,
  getApplicationFieldColumnId,
} from "../../lib/applications/table-fields";
import { getProgramSummaryFields } from "../../lib/applications/summary-fields";
import { legacyPreadmissionFormDefinition } from "../../lib/forms/legacy-preadmission-template";
import { formatProgramFieldValue } from "../../lib/forms/format-field-value";
import { parseProgramFormDefinition } from "../../components/sections/shell/programs/create/form-builder/utils";
import { deserializeProgramFormValue } from "../../components/sections/shell/programs/create/form-builder/program-form-runtime";
import type { DateRange } from "react-day-picker";

export const applicationTableConfigurationValidator = v.object({
  visibleColumns: v.array(v.string()),
  fields: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      section: v.string(),
      programs: v.array(v.string()),
    }),
  ),
});
export const applicationFormValuesValidator = v.record(
  v.string(),
  v.union(v.string(), v.number(), v.boolean(), v.null()),
);

export async function getApplicationTablePreference(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
) {
  return await ctx.db
    .query("applicationTablePreferences")
    .withIndex("by_userId_and_organizationId", (q) =>
      q.eq("userId", userId).eq("organizationId", organizationId),
    )
    .unique();
}

export async function getApplicationTableCatalog(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
) {
  const programs = await ctx.db
    .query("programs")
    .withIndex("byOrganization", (q) => q.eq("organizationId", organizationId))
    .take(501);
  if (programs.length > 500)
    throw new Error("Too many programs to configure application columns");
  return buildApplicationFieldCatalog(
    programs.sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export async function getApplicationTableConfiguration(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
) {
  const [preference, fields] = await Promise.all([
    getApplicationTablePreference(ctx, userId, organizationId),
    getApplicationTableCatalog(ctx, organizationId),
  ]);
  const available = new Set([
    ...DEFAULT_APPLICATION_COLUMNS,
    ...fields.map((field) => field.id),
  ]);
  return {
    visibleColumns: (
      preference?.visibleColumns ?? DEFAULT_APPLICATION_COLUMNS
    ).filter((id) => available.has(id)),
    fields,
  };
}

function getFieldReferences(
  definition: ReturnType<typeof parseProgramFormDefinition>,
) {
  return new Map(
    getProgramSummaryFields(definition).map((entry) => [
      getApplicationFieldColumnId(entry.sectionKey, entry.field),
      entry,
    ]),
  );
}

export async function projectApplicationTableFields(
  ctx: QueryCtx,
  applications: Doc<"applications">[],
  fieldIds: string[],
) {
  const programIds = [
    ...new Set(
      applications.flatMap((application) =>
        application.programId ? [application.programId] : [],
      ),
    ),
  ];
  const programs = await Promise.all(
    programIds.map((id) => ctx.db.get("programs", id)),
  );
  const programFields = new Map(
    programs
      .filter((program) => program !== null)
      .map((program) => [
        program._id,
        {
          organizationId: program.organizationId,
          fields: getFieldReferences(
            parseProgramFormDefinition(program.formDefinition),
          ),
        },
      ]),
  );
  const legacyFields = getFieldReferences(legacyPreadmissionFormDefinition);
  return applications.map((application) => {
    const program = application.programId
      ? programFields.get(application.programId)
      : undefined;
    const current =
      program?.organizationId === application.organizationId
        ? program.fields
        : legacyFields;
    const historical = application.formDefinitionSnapshot
      ? getFieldReferences(
          parseProgramFormDefinition(application.formDefinitionSnapshot),
        )
      : null;
    const formSortValues: Record<string, number | null> = {};
    const formValues = Object.fromEntries(
      fieldIds.map((id) => {
        const entry = historical?.get(id) ?? current.get(id);
        if (!entry) return [id, "—"];
        const raw = application.formData[entry.sectionKey]?.[entry.field.name];
        if (raw == null || (typeof raw === "string" && !raw.trim()))
          return [id, null];
        const value = deserializeProgramFormValue(entry.field, raw);
        if (entry.field.fieldType === "DatePicker") {
          const date =
            value instanceof Date
              ? value
              : (value as DateRange | undefined)?.from;
          formSortValues[id] =
            date instanceof Date && Number.isFinite(date.getTime())
              ? date.getTime()
              : null;
        }
        return [
          id,
          typeof value === "boolean" || typeof value === "number"
            ? value
            : formatProgramFieldValue(entry.field, value, "", "") ||
              String(raw),
        ];
      }),
    );
    return {
      formValues,
      ...(Object.keys(formSortValues).length ? { formSortValues } : {}),
    };
  });
}
