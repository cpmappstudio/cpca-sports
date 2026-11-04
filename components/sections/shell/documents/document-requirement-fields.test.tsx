// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { AddDocumentTypeForm } from "./add-document-type-form";
import { DocumentDefaultsManager } from "./document-defaults-manager";
import { DocumentRequirementFields } from "./document-requirement-fields";
import type { DocumentAttachment } from "@/lib/applications/document-attachments";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/hooks/use-is-admin", () => ({
  useIsAdmin: () => ({ isAdmin: true }),
}));

const attachment: DocumentAttachment = {
  id: "attachment" as DocumentAttachment["id"],
  fileName: "form.pdf",
  contentType: "application/pdf",
  fileSize: 4,
  url: "https://files.example.com/form.pdf",
};

test("creation includes the attachment editor and the same fields used for editing", () => {
  const html = renderToStaticMarkup(
    <AddDocumentTypeForm onAddDocument={vi.fn()} onClose={vi.fn()} />,
  );
  expect(html).toContain("form.documentName");
  expect(html).toContain("form.description");
  expect(html).toContain("form.required");
  expect(html.match(/type="file"/g)).toHaveLength(1);
  expect(html).toContain(">upload</button>");
  const editHtml = renderToStaticMarkup(
    <DocumentRequirementFields
      value={{ name: "Consent", required: true, attachment }}
      disabled={false}
      onChange={vi.fn()}
    />,
  );
  expect(editHtml).toContain("form.pdf");
  expect(editHtml).toContain(">replace</button>");
  expect(editHtml).toContain('aria-label="remove"');
});

test("program cards preview existing files without exposing attachment controls", () => {
  const html = renderToStaticMarkup(
    <DocumentDefaultsManager
      documents={[
        {
          documentTypeId: "consent",
          name: "Consent",
          visibility: "required",
          attachmentId: attachment.id,
          attachment,
        },
      ]}
      loadingText="Loading"
      emptyTitle="Empty"
      emptyDescription="No documents"
      activeHint="Requested"
      hiddenHint="Hidden"
      onChange={vi.fn()}
    />,
  );
  expect(html).toContain("form.pdf");
  expect(html).not.toContain('type="file"');
  expect(html).toContain('href="https://files.example.com/form.pdf"');
  expect(html).not.toContain('aria-label="remove"');
});
