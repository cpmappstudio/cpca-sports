import { v, type Infer } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  documentMetadataMatches,
  scheduleProgramDocumentSync,
} from "./documentSync";

import {
  assertDocumentAttachmentAccess,
  scheduleDocumentAttachmentCleanup,
} from "./documentAttachments";

const documentVisibility = v.union(
  v.literal("required"),
  v.literal("optional"),
  v.literal("hidden"),
);

export const defaultDocumentConfigValidator = v.object({
  documentTypeId: v.string(),
  attachmentId: v.optional(v.id("documentAttachments")),
  name: v.string(),
  description: v.optional(v.string()),
  visibility: documentVisibility,
});

export async function clearProgramDocumentConfigs(
  ctx: MutationCtx,
  programId: Id<"programs">,
) {
  const documentConfigs = await ctx.db
    .query("programDocumentConfig")
    .withIndex("byProgram", (q) => q.eq("programId", programId))
    .collect();

  for (const documentConfig of documentConfigs) {
    await ctx.db.delete(documentConfig._id);
    await scheduleDocumentAttachmentCleanup(ctx, documentConfig.attachmentId);
  }
}

export async function clearTemplateDocumentConfigs(
  ctx: MutationCtx,
  templateId: Id<"formTemplates">,
) {
  const documentConfigs = await ctx.db
    .query("templateDocumentConfig")
    .withIndex("byTemplate", (q) => q.eq("templateId", templateId))
    .collect();

  for (const documentConfig of documentConfigs) {
    await ctx.db.delete(documentConfig._id);
    await scheduleDocumentAttachmentCleanup(ctx, documentConfig.attachmentId);
  }
}

export async function replaceProgramDocumentConfigs(
  ctx: MutationCtx,
  params: {
    programId: Id<"programs">;
    userId: Id<"users">;
    documents: Array<Infer<typeof defaultDocumentConfigValidator>>;
  },
) {
  const program = await ctx.db.get("programs", params.programId);
  if (!program) throw new Error("Program not found");
  await validateAttachments(ctx, params.documents, program.organizationId);
  const existing = await ctx.db
    .query("programDocumentConfig")
    .withIndex("byProgram", (q) => q.eq("programId", params.programId))
    .collect();
  const byType = new Map(
    existing.map((document) => [document.documentTypeId, document]),
  );
  const ids = new Set(
    params.documents.map((document) => document.documentTypeId),
  );
  if (ids.size !== params.documents.length)
    throw new Error("Duplicate document type IDs");
  let changed = false;
  for (const document of existing) {
    if (ids.has(document.documentTypeId)) continue;
    await ctx.db.delete("programDocumentConfig", document._id);
    await scheduleDocumentAttachmentCleanup(ctx, document.attachmentId);
    changed = true;
  }
  for (const document of params.documents) {
    const current = byType.get(document.documentTypeId);
    if (current && documentMetadataMatches(current, document)) continue;
    const values = {
      ...document,
      attachmentId: document.attachmentId,
      updatedAt: Date.now(),
      updatedBy: params.userId,
    };
    if (current) {
      await ctx.db.patch("programDocumentConfig", current._id, values);
      if (current.attachmentId !== document.attachmentId)
        await scheduleDocumentAttachmentCleanup(ctx, current.attachmentId);
    } else
      await ctx.db.insert("programDocumentConfig", {
        ...values,
        programId: params.programId,
      });
    changed = true;
  }
  if (changed)
    await scheduleProgramDocumentSync(ctx, params.programId, params.userId);
}

export async function replaceTemplateDocumentConfigs(
  ctx: MutationCtx,
  params: {
    templateId: Id<"formTemplates">;
    userId: Id<"users">;
    documents: Array<Infer<typeof defaultDocumentConfigValidator>>;
  },
) {
  const template = await ctx.db.get("formTemplates", params.templateId);
  if (!template) throw new Error("Template not found");
  await validateAttachments(ctx, params.documents, template.organizationId);
  await clearTemplateDocumentConfigs(ctx, params.templateId);

  for (const document of params.documents) {
    await ctx.db.insert("templateDocumentConfig", {
      templateId: params.templateId,
      documentTypeId: document.documentTypeId,
      attachmentId: document.attachmentId,
      name: document.name,
      description: document.description,
      visibility: document.visibility,
      updatedAt: Date.now(),
      updatedBy: params.userId,
    });
  }
}

export async function cloneProgramDocumentsToTemplate(
  ctx: MutationCtx,
  params: {
    programId: Id<"programs">;
    templateId: Id<"formTemplates">;
    userId: Id<"users">;
  },
) {
  const programDocuments = await ctx.db
    .query("programDocumentConfig")
    .withIndex("byProgram", (q) => q.eq("programId", params.programId))
    .collect();

  for (const document of programDocuments) {
    await ctx.db.insert("templateDocumentConfig", {
      templateId: params.templateId,
      documentTypeId: document.documentTypeId,
      attachmentId: document.attachmentId,
      name: document.name,
      description: document.description,
      visibility: document.visibility,
      updatedAt: Date.now(),
      updatedBy: params.userId,
    });
  }
}

export async function cloneTemplateDocumentsToTemplate(
  ctx: MutationCtx,
  params: {
    sourceTemplateId: Id<"formTemplates">;
    targetTemplateId: Id<"formTemplates">;
    userId: Id<"users">;
  },
) {
  const templateDocuments = await ctx.db
    .query("templateDocumentConfig")
    .withIndex("byTemplate", (q) => q.eq("templateId", params.sourceTemplateId))
    .collect();

  for (const document of templateDocuments) {
    await ctx.db.insert("templateDocumentConfig", {
      templateId: params.targetTemplateId,
      documentTypeId: document.documentTypeId,
      attachmentId: document.attachmentId,
      name: document.name,
      description: document.description,
      visibility: document.visibility,
      updatedAt: Date.now(),
      updatedBy: params.userId,
    });
  }
}

async function validateAttachments(
  ctx: MutationCtx,
  documents: Array<Infer<typeof defaultDocumentConfigValidator>>,
  organizationId: Id<"organizations">,
) {
  const ids = new Set(
    documents.flatMap((document) =>
      document.attachmentId ? [document.attachmentId] : [],
    ),
  );
  await Promise.all(
    [...ids].map((id) =>
      assertDocumentAttachmentAccess(ctx, id, organizationId),
    ),
  );
}
