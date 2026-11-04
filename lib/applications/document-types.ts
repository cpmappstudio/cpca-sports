import type { DocumentAttachment } from "./document-attachments";
import { Id } from "@/convex/_generated/dataModel";

export type DocumentType = {
  id: string;
  name: string;
  description?: string;
};

export type DocumentStatus = "pending" | "approved" | "rejected";

export type DocumentVisibility = "required" | "optional" | "hidden";

export type DocumentConfig = {
  _id: Id<"applicationDocumentConfig">;
  _creationTime: number;
  applicationId: Id<"applications">;
  documentTypeId: string;
  visibility: DocumentVisibility;
  attachmentId?: Id<"documentAttachments">;
  attachment?: DocumentAttachment;
  updatedAt: number;
  updatedBy: Id<"users">;
  sourceProgramId?: Id<"programs">;
  isCustomized?: boolean;
  isRemoved?: boolean;
  isCustom?: boolean;
  name?: string;
  description?: string;
};

export type ApplicationDocument = {
  _id: Id<"applicationDocuments">;
  _creationTime: number;
  applicationId: Id<"applications">;
  documentTypeId: string;
  name: string;
  description?: string;
  sourceAttachmentId?: Id<"documentAttachments">;
  lastSaveId?: string;
  storageId: Id<"_storage">;
  fileName: string;
  contentType: string;
  fileSize: number;
  status: DocumentStatus;
  uploadedBy: Id<"users">;
  uploadedAt: number;
  reviewedBy?: Id<"users">;
  reviewedAt?: number;
  rejectionReason?: string;
  url?: string | null;
};

export type UploadedByUser = {
  _id: Id<"users">;
  firstName: string;
  lastName: string;
  email: string;
};

export type ApplicationDocumentWithUser = ApplicationDocument & {
  uploadedByUser?: UploadedByUser;
};
