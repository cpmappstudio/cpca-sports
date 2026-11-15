"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/dialog";
import { DocumentViewerHeader } from "@/components/documents/document-viewer-header";
import { DocumentViewerActions } from "@/components/documents/document-viewer-actions";
import type { PdfViewerHandle } from "@/components/documents/pdf-viewer";
import { downloadDocument } from "@/lib/documents/download-document";
import { COACH_ACTIVITY_TIME_ZONE } from "@/convex/lib/coachActivityTime";
import { formatActivityDate } from "@/lib/coaches/activity-period";
import type {
  CoachActivityReportSnapshot,
  CoachActivityReportTranslate,
} from "@/lib/coaches/types";
const PdfViewer = dynamic(() => import("@/components/documents/pdf-viewer"), {
  ssr: false,
});

export function ActivityReportPreview({
  snapshot,
  translate,
  onClose,
}: {
  snapshot: CoachActivityReportSnapshot;
  translate: CoachActivityReportTranslate;
  onClose: () => void;
}) {
  const t = useTranslations("Coaches.report");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<
    { url: string; blob: Blob } | { error: true } | null
  >(null);
  const [viewerError, setViewerError] = useState(false);
  const [ready, setReady] = useState(false);
  const viewer = useRef<PdfViewerHandle>(null);
  const coachName =
    snapshot.coach.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "coach";
  const fileName = t("fileName", {
    name: coachName,
    from: snapshot.range.from,
    to: snapshot.range.to,
    locale: snapshot.locale,
  });
  useEffect(() => {
    let cancelled = false;
    let url: string | undefined;
    async function generate() {
      try {
        const { generateActivityReportPdf } =
          await import("@/lib/coaches/activity-report-pdf");
        const blob = await generateActivityReportPdf(snapshot, translate);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setResult({ url, blob });
      } catch {
        if (!cancelled) setResult({ error: true });
      }
    }
    void generate();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [snapshot, translate, attempt]);
  const pdf = result && "url" in result ? result : null;
  const url = pdf?.url;
  return (
    <DialogContent
      showCloseButton={false}
      className="flex h-[92dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
    >
      <DocumentViewerHeader
        title={t("title")}
        description={
          <>
            {snapshot.coach.name} ·{" "}
            {formatActivityDate(snapshot.range.from, snapshot.locale)} -{" "}
            {formatActivityDate(snapshot.range.to, snapshot.locale)}
            <span className="mt-1 block">
              {translate("detail.timeZoneNotice", {
                timeZone: COACH_ACTIVITY_TIME_ZONE,
              })}
            </span>
          </>
        }
        onClose={onClose}
        actions={
          pdf ? (
            <DocumentViewerActions
              onDownload={() => downloadDocument(pdf.blob, fileName)}
              downloadLabel={t("download")}
              onPrint={() => viewer.current!.printPdf()}
              printDisabled={!ready || viewerError}
              openUrl={pdf.url}
            />
          ) : undefined
        }
      />
      <div className="min-h-0 flex-1">
        {!result ? (
          <div
            role="status"
            className="flex h-full items-center justify-center gap-2 p-6"
          >
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            {t("generating")}
          </div>
        ) : null}
        {result && "error" in result ? (
          <div
            role="alert"
            className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"
          >
            <p>{t("error")}</p>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setAttempt((value) => value + 1);
              }}
            >
              {t("retry")}
            </Button>
          </div>
        ) : null}
        {url && !viewerError ? (
          <PdfViewer
            src={url}
            name={fileName}
            viewerRef={viewer}
            onReady={() => setReady(true)}
            onError={() => setViewerError(true)}
          />
        ) : null}
        {viewerError ? (
          <p role="status" className="p-6 text-sm text-muted-foreground">
            {t("previewError")}
          </p>
        ) : null}
      </div>
    </DialogContent>
  );
}
