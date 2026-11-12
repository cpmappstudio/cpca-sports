"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { PdfViewerHandle } from "@/components/documents/pdf-viewer";
import { DOCUMENT_ATTACHMENT_MAX_SIZE } from "@/lib/applications/document-attachments";
import { downloadDocument } from "@/lib/documents/download-document";

type PdfDocument = NonNullable<FunctionReturnType<typeof api.documentPdf.get>>;
type PendingSave = { blob: Blob; saveId: string };

export function useApplicationDocumentPdf({
  applicationId,
  documentTypeId,
  initial,
  latest,
  onSaved,
}: {
  applicationId: Id<"applications">;
  documentTypeId: string;
  initial: PdfDocument;
  latest: PdfDocument | null;
  onSaved: (storageId: string) => void;
}) {
  const [document] = useState(initial);
  const { getToken } = useAuth();
  const viewer = useRef<PdfViewerHandle>(null);
  const busy = useRef(false);
  const loaded = useRef(false);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingSave | null>(null);
  const [error, setError] = useState<"saveError" | "tooLarge" | null>(null);
  const [saveConflict, setSaveConflict] = useState(false);
  const conflict =
    saveConflict ||
    !latest ||
    latest.sourceAttachmentId !== document.sourceAttachmentId ||
    (latest.storageId !== document.storageId &&
      !(pending && latest.lastSaveId === pending.saveId));
  const unsaved = dirty || !!pending || saving;

  // shortcut: SPA navigation has no beforeunload event; persistent drafts would add recovery.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  async function save() {
    if (busy.current || !ready || conflict) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      let attempt = pending;
      if (!attempt) {
        const blob = await viewer.current!.exportPdf();
        if (blob.size <= 0 || blob.size > DOCUMENT_ATTACHMENT_MAX_SIZE) {
          setError("tooLarge");
          return;
        }
        attempt = { blob, saveId: crypto.randomUUID() };
        setPending(attempt);
      }
      const token = await getToken({ template: "convex" });
      if (!token) throw new Error("PDF_UNAVAILABLE");
      const site =
        process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
        process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
          /\.convex\.cloud$/,
          ".convex.site",
        );
      if (!site) throw new Error("PDF_SAVE_FAILED");
      const url = new URL("/application-document-pdf", site);
      url.search = new URLSearchParams({
        applicationId,
        documentTypeId,
        sourceAttachmentId: document.sourceAttachmentId,
        ...(document.storageId
          ? { expectedStorageId: document.storageId }
          : {}),
        saveId: attempt.saveId,
      }).toString();
      const response = await fetch(url, {
        method: "POST",
        body: attempt.blob,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/pdf",
          "X-File-Name": encodeURIComponent(document.fileName),
        },
      });
      const result: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "PDF_SAVE_FAILED",
        );
      if (
        !result ||
        typeof result !== "object" ||
        !("storageId" in result) ||
        typeof result.storageId !== "string"
      )
        throw new Error("PDF_SAVE_FAILED");
      setDirty(false);
      setPending(null);
      onSaved(result.storageId);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      if (["PDF_CONFLICT", "PDF_UNAVAILABLE"].includes(code))
        setSaveConflict(true);
      else if (["PDF_TOO_LARGE", "INVALID_PDF"].includes(code)) {
        setPending(null);
        setError("tooLarge");
      } else setError("saveError");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function download() {
    const blob = pending?.blob ?? (await viewer.current!.exportPdf());
    await downloadDocument(blob, document.fileName);
  }

  return {
    document,
    viewer,
    ready,
    dirty,
    saving,
    pending: !!pending,
    error,
    conflict,
    unsaved,
    save,
    download,
    onReady: () => {
      loaded.current = true;
      setReady(true);
    },
    onChange: () => {
      if (loaded.current) setDirty(true);
    },
  };
}
