"use client";

import { useId, useRef, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationDocumentWithUser } from "@/lib/applications/document-types";
import type { ApplicationDocuments } from "./application-documents";
import { ApplicationDocumentStatus } from "./application-document-status";

type Decision = "approved" | "rejected";

export function ApplicationDocumentReview({
  document,
  canReview,
  disabled,
  onBusyChange,
  onComplete,
  onUpdateStatus,
}: {
  document: ApplicationDocumentWithUser;
  canReview: boolean;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onComplete: () => void;
  onUpdateStatus: ComponentProps<typeof ApplicationDocuments>["onUpdateStatus"];
}) {
  const t = useTranslations("Applications.documents.review");
  const tDocuments = useTranslations("Applications.documents");
  const reasonId = useId();
  const busy = useRef(false);
  const [changing, setChanging] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState<Decision | null>(null);
  const [error, setError] = useState(false);
  const editing = canReview && (changing || decision === "rejected");
  const blocked = disabled || !!saving;

  function cancel() {
    setChanging(false);
    setDecision(null);
    setReason("");
    setError(false);
  }

  async function review(status: Decision) {
    if (
      !canReview ||
      disabled ||
      busy.current ||
      status === document.status ||
      (document.status !== "pending" && !changing) ||
      (status === "rejected" && !reason.trim())
    )
      return;
    busy.current = true;
    setSaving(status);
    onBusyChange(true);
    setError(false);
    try {
      await onUpdateStatus({
        documentId: document._id,
        status,
        ...(status === "rejected" ? { rejectionReason: reason.trim() } : {}),
      });
      onComplete();
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setSaving(null);
      onBusyChange(false);
    }
  }

  return (
    <section
      role="group"
      aria-label={t("label")}
      className="min-w-0 space-y-3 border-t pt-3"
      aria-busy={!!saving}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{t("label")}</p>
          <ApplicationDocumentStatus status={document.status} />
        </div>
        {canReview && !editing ? (
          document.status === "pending" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={blocked}
                onClick={() => {
                  setDecision("rejected");
                  setReason("");
                  setError(false);
                }}
                variant="outline"
              >
                <XCircle />
                {t("reject")}
              </Button>
              <Button
                type="button"
                disabled={blocked}
                onClick={() => void review("approved")}
              >
                {saving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle2 />
                )}
                {t("approve")}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={blocked}
              onClick={() => {
                setChanging(true);
                setDecision(null);
                setReason("");
                setError(false);
              }}
            >
              {t("changeDecision")}
            </Button>
          )
        ) : null}
      </div>
      {document.status === "rejected" && document.rejectionReason ? (
        <p className="whitespace-pre-wrap break-words text-sm">
          {tDocuments("rejectionReason")}: {document.rejectionReason}
        </p>
      ) : null}
      {editing ? (
        <form
          className="max-w-xl space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (decision) void review(decision);
          }}
        >
          {changing ? (
            <fieldset className="space-y-2" disabled={blocked}>
              <legend className="text-sm font-medium">
                {t("newDecision")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {(["approved", "rejected"] as const).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={decision === option ? "default" : "outline"}
                    aria-pressed={decision === option}
                    disabled={blocked || option === document.status}
                    onClick={() => {
                      setDecision(option);
                      setError(false);
                    }}
                  >
                    {tDocuments(`status.${option}`)}
                  </Button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {decision === "rejected" ? (
            <div className="space-y-2">
              <Label htmlFor={reasonId}>{t("reason")}</Label>
              <Textarea
                id={reasonId}
                required
                value={reason}
                disabled={blocked}
                className="max-h-32"
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={blocked}
              onClick={cancel}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                blocked ||
                !decision ||
                decision === document.status ||
                (decision === "rejected" && !reason.trim())
              }
            >
              {saving ? <Loader2 className="animate-spin" /> : null}
              {t(saving ? "saving" : changing ? "confirmChange" : "confirm")}
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t("error")}
        </p>
      ) : null}
    </section>
  );
}
