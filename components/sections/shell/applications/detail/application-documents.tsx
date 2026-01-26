"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileIcon, CheckCircle2, XCircle, Eye } from "lucide-react";
import {
  APPLICATION_DOCUMENTS,
  type DocumentType,
} from "@/lib/applications/document-types";
import { cn } from "@/lib/utils";

type DocumentStatus = "pending" | "uploaded" | "rejected";

type UploadedDocument = {
  documentId: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  status: DocumentStatus;
  fileUrl?: string;
  rejectionReason?: string;
};

interface ApplicationDocumentsProps {
  applicationId: string;
  isAdmin: boolean;
}

export function ApplicationDocuments({
  applicationId,
  isAdmin,
}: ApplicationDocumentsProps) {
  const [uploadedDocuments, setUploadedDocuments] = useState<
    UploadedDocument[]
  >([
    {
      documentId: "birth_certificate",
      fileName: "birth_certificate_john_doe.pdf",
      uploadedAt: "2026-01-10",
      uploadedBy: "John Doe",
      status: "uploaded",
      fileUrl: "#",
    },
    {
      documentId: "passport",
      fileName: "passport_john_doe.pdf",
      uploadedAt: "2026-01-12",
      uploadedBy: "John Doe",
      status: "uploaded",
      fileUrl: "#",
    },
  ]);

  const handleFileUpload = (documentId: string, file: File) => {
    const newDocument: UploadedDocument = {
      documentId,
      fileName: file.name,
      uploadedAt: new Date().toISOString().split("T")[0],
      uploadedBy: isAdmin ? "Admin" : "Applicant",
      status: "uploaded",
      fileUrl: "#",
    };

    setUploadedDocuments((prev) => {
      const filtered = prev.filter((doc) => doc.documentId !== documentId);
      return [...filtered, newDocument];
    });
  };

  const handleStatusChange = (
    documentId: string,
    status: DocumentStatus,
    rejectionReason?: string,
  ) => {
    setUploadedDocuments((prev) =>
      prev.map((doc) =>
        doc.documentId === documentId
          ? { ...doc, status, rejectionReason }
          : doc,
      ),
    );
  };

  const getDocumentStatus = (documentId: string): UploadedDocument | null => {
    return (
      uploadedDocuments.find((doc) => doc.documentId === documentId) || null
    );
  };

  return (
    <div className="space-y-4">
      {APPLICATION_DOCUMENTS.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          uploadedDocument={getDocumentStatus(document.id)}
          isAdmin={isAdmin}
          onUpload={handleFileUpload}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  );
}

interface DocumentCardProps {
  document: DocumentType;
  uploadedDocument: UploadedDocument | null;
  isAdmin: boolean;
  onUpload: (documentId: string, file: File) => void;
  onStatusChange: (
    documentId: string,
    status: DocumentStatus,
    rejectionReason?: string,
  ) => void;
}

function DocumentCard({
  document,
  uploadedDocument,
  isAdmin,
  onUpload,
  onStatusChange,
}: DocumentCardProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onUpload(document.id, file);
    setIsUploading(false);
    e.target.value = "";
  };

  const getStatusBadge = () => {
    if (!uploadedDocument) {
      return (
        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3" />
          No file chosen
        </Badge>
      );
    }

    switch (uploadedDocument.status) {
      case "uploaded":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
          >
            <CheckCircle2 className="h-3 w-3" />
            Uploaded
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card
      className={cn(
        "transition-colors",
        uploadedDocument?.status === "rejected" && "border-destructive",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex items-center gap-2">
              <CardTitle className="text-base">{document.name}</CardTitle>
              {document.required && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
            {document.description && (
              <CardDescription className="mt-1 text-sm">
                {document.description}
              </CardDescription>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {uploadedDocument && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {uploadedDocument.fileName}
                </span>
                <span className="text-xs text-muted-foreground">
                  Uploaded on {uploadedDocument.uploadedAt} by{" "}
                  {uploadedDocument.uploadedBy}
                </span>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="gap-1">
              <Eye className="h-4 w-4" />
              View
            </Button>
          </div>
        )}

        {uploadedDocument?.status === "rejected" &&
          uploadedDocument.rejectionReason && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                <strong>Rejection reason:</strong>{" "}
                {uploadedDocument.rejectionReason}
              </p>
            </div>
          )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="file"
              id={`file-${document.id}`}
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              disabled={isUploading}
            >
              <label htmlFor={`file-${document.id}`} className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {isUploading
                  ? "Uploading..."
                  : uploadedDocument
                    ? "Replace file"
                    : "Upload file"}
              </label>
            </Button>
          </div>

          {isAdmin && uploadedDocument && (
            <>
              {uploadedDocument.status !== "uploaded" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => onStatusChange(document.id, "uploaded")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              {uploadedDocument.status !== "rejected" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    onStatusChange(
                      document.id,
                      "rejected",
                      "Document quality is not sufficient. Please upload a clearer version.",
                    )
                  }
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
