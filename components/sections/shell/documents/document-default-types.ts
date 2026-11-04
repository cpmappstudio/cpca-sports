"use client";

import type { Id } from "@/convex/_generated/dataModel";
import type { DocumentAttachment } from "@/lib/applications/document-attachments";

type DocumentVisibility = "required" | "optional" | "hidden";

export interface EditableDocumentConfig {
  documentTypeId: string;
  name: string;
  description?: string;
  visibility: DocumentVisibility;
  attachmentId?: Id<"documentAttachments">;
  attachment?: DocumentAttachment;
  pendingFile?: File;
}

export function createEditableDocumentTypeId(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  return `document_${base || "custom"}_${Date.now().toString(36)}`;
}

export function mapEditableDocumentConfigs(
  configs: Array<{
    documentTypeId: string;
    name: string;
    description?: string;
    visibility: DocumentVisibility;
    attachmentId?: Id<"documentAttachments">;
    attachment?: DocumentAttachment;
  }>,
): EditableDocumentConfig[] {
  return configs.map((config) => ({
    documentTypeId: config.documentTypeId,
    name: config.name,
    description: config.description,
    visibility: config.visibility,
    attachmentId: config.attachmentId,
    attachment: config.attachment,
  }));
}

export function serializeEditableDocumentConfigs(
  configs: EditableDocumentConfig[],
) {
  return JSON.stringify(
    configs.map((config) => ({
      documentTypeId: config.documentTypeId,
      name: config.name.trim(),
      description: config.description?.trim() || undefined,
      visibility: config.visibility,
      attachmentId: config.attachmentId,
      pendingFile: config.pendingFile
        ? {
            name: config.pendingFile.name,
            size: config.pendingFile.size,
            lastModified: config.pendingFile.lastModified,
          }
        : undefined,
    })),
  );
}

export function getSavableDocumentConfigs(
  configs: EditableDocumentConfig[] | null,
) {
  return configs?.map(
    ({ documentTypeId, name, description, visibility, attachmentId }) => ({
      documentTypeId,
      name,
      description,
      visibility,
      attachmentId,
    }),
  );
}

export async function uploadPendingDocumentAttachments(
  configs: EditableDocumentConfig[] | null,
  upload: (file: File) => Promise<DocumentAttachment>,
) {
  if (configs === null) return null;
  const resolved: EditableDocumentConfig[] = [];
  for (const config of configs) {
    if (!config.pendingFile) {
      resolved.push(config);
      continue;
    }
    const attachment = await upload(config.pendingFile);
    resolved.push({
      ...config,
      attachment,
      attachmentId: attachment.id,
      pendingFile: undefined,
    });
  }
  return resolved;
}
