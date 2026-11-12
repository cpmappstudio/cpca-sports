// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { expect, test, vi } from "vitest";
import { ApplicationDocuments } from "./application-documents";
import type {
  DocumentConfig,
  ApplicationDocumentWithUser,
} from "@/lib/applications/document-types";

const role = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@/hooks/use-is-admin", () => ({ useIsAdmin: () => role }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ dateTime: () => "Nov 3, 2026" }),
}));

const config: DocumentConfig = {
  _id: "config" as DocumentConfig["_id"],
  _creationTime: 1,
  applicationId: "application" as DocumentConfig["applicationId"],
  documentTypeId: "consent",
  name: "Consent",
  visibility: "required",
  updatedAt: 1,
  updatedBy: "admin" as DocumentConfig["updatedBy"],
  isCustom: true,
};
const upload: ApplicationDocumentWithUser = {
  _id: "upload" as ApplicationDocumentWithUser["_id"],
  _creationTime: 1,
  applicationId: config.applicationId,
  documentTypeId: "consent",
  name: "Old consent name",
  storageId: "file" as ApplicationDocumentWithUser["storageId"],
  fileName: "original.pdf",
  contentType: "application/pdf",
  fileSize: 1,
  status: "approved",
  uploadedBy: config.updatedBy,
  uploadedAt: 1,
};

function render(
  documentConfigs: DocumentConfig[],
  documents: ApplicationDocumentWithUser[] = [],
) {
  const props: ComponentProps<typeof ApplicationDocuments> = {
    applicationId: config.applicationId,
    documentConfigs,
    documents,
    onUpload: vi.fn(),
    onUploadAttachment: vi.fn(),
    onUpdateRequirement: vi.fn(),
    onUpdateStatus: vi.fn(),
    onUpdateVisibility: vi.fn(),
    onGenerateUploadUrl: vi.fn(),
    onRemove: vi.fn(),
    onCreateCustomDocumentType: vi.fn(),
    onDeleteCustomDocumentType: vi.fn(),
  };
  return renderToStaticMarkup(<ApplicationDocuments {...props} />);
}

test("a program without document requirements no longer gets legacy default cards", () => {
  role.isAdmin = true;
  const html = render([]);
  expect(html).toContain(">empty</p>");
  expect(html).not.toContain("Arrival and Departure");
  expect(html).not.toContain("status.notUploaded");
});

test("only configured requirements are rendered and uploads appear once under their current name", () => {
  role.isAdmin = true;
  const html = render([config], [upload]);
  expect(html.match(/>Consent</g)).toHaveLength(1);
  expect(html).toContain("visibility.required");
  expect(html).toContain("original.pdf");
  expect(html).toContain("status.approved");
  expect(html).not.toContain("Old consent name");
  expect(html).not.toContain("Birth Certificate");
});

test("a required historical document without its file keeps its card and upload control", () => {
  role.isAdmin = false;
  const html = render([{ ...config, isCustom: undefined }]);
  expect(html).toContain(">Consent</");
  expect(html).toContain("visibility.required");
  expect(html).toContain("status.notUploaded");
  expect(html).toContain('id="file-consent"');
  expect(html).toContain("actions.upload");
});

test("historical uploads remain visible even without a requirement or with a legacy nameless config", () => {
  role.isAdmin = true;
  expect(render([], [upload])).toContain("Old consent name");
  const html = render(
    [{ ...config, name: undefined, isCustom: undefined }],
    [upload],
  );
  expect(html).toContain("Old consent name");
  expect(html).toContain("visibility.required");
  expect(html.match(/original.pdf/g)).toHaveLength(1);
});

test("hidden requirements and their uploads stay hidden from applicants and remain available to administrators", () => {
  const hidden = { ...config, visibility: "hidden" as const };
  role.isAdmin = false;
  const memberHtml = render([hidden], [upload]);
  expect(memberHtml).not.toContain("Consent");
  expect(memberHtml).not.toContain("original.pdf");
  role.isAdmin = true;
  const adminHtml = render([hidden], [upload]);
  expect(adminHtml).toContain("Consent");
  expect(adminHtml).toContain("original.pdf");
  expect(adminHtml).toContain("visibility.hidden");
});

test("newest requirements appear first without moving older documents when edited or uploaded", () => {
  role.isAdmin = false;
  const html = render(
    [
      { ...config, updatedAt: 100 },
      {
        ...config,
        documentTypeId: "program-document",
        name: "Program document",
        _creationTime: 2,
        sourceProgramId: "program" as NonNullable<
          DocumentConfig["sourceProgramId"]
        >,
      },
      {
        ...config,
        documentTypeId: "personal-document",
        name: "Personal document",
        _creationTime: 4,
      },
    ],
    [
      { ...upload, uploadedAt: 100 },
      {
        ...upload,
        documentTypeId: "historical-document",
        name: "Historical document",
        _creationTime: 3,
      },
    ],
  );
  const cardNames = [
    "Personal document",
    "Historical document",
    "Program document",
    "Consent",
  ];
  const positions = cardNames.map((name) => html.indexOf(`>${name}</`));
  expect(positions.every((position) => position !== -1)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
});

test.each([false, true])(
  "only admins have a separate school-file preview; PDF completion and upload remain available (admin: %s)",
  (isAdmin) => {
    role.isAdmin = isAdmin;
    const html = render([
      {
        ...config,
        attachment: {
          id: "attachment" as NonNullable<DocumentConfig["attachmentId"]>,
          fileName: "blank-form.pdf",
          contentType: "application/pdf",
          fileSize: 4,
          url: "https://files.example.com/blank-form.pdf",
        },
      },
    ]);
    expect(html.includes("blank-form.pdf")).toBe(isAdmin);
    expect(
      html.includes('href="https://files.example.com/blank-form.pdf"'),
    ).toBe(isAdmin);
    expect(html).toContain("pdf.complete");
    expect(html).toContain(
      isAdmin ? "submission.empty" : "submission.completeInstructions",
    );
    expect(html).not.toContain("attachment.upload");
    expect(html).toContain("status.notUploaded");
    expect(html).toContain("actions.upload");
    expect(html).not.toContain(">replace</button>");
    expect(html).not.toContain('aria-label="remove"');
    expect(html.match(/type="file"/g)).toHaveLength(1);
  },
);
