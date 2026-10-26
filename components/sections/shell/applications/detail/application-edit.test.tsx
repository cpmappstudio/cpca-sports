// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { Application } from "@/lib/applications/types";
import type { Id } from "@/convex/_generated/dataModel";
import { ApplicationHeader } from "./application-header";
import { ApplicationDynamicForm } from "./application-dynamic-form";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/hooks/use-is-admin", () => ({
  useIsAdmin: () => ({ isAdmin: false }),
}));
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => null,
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({}),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("./application-transfer-dialog", () => ({
  ApplicationTransferDialog: () => null,
}));

function application(version: 1 | 2): Application {
  return {
    _id: "application" as Id<"applications">,
    _creationTime: 1,
    organizationId: "organization" as Id<"organizations">,
    userId: "user" as Id<"users">,
    programId: "program" as Id<"programs">,
    applicationCode: "APP-TEST",
    status: "pending",
    applicant: {
      firstName: "Original",
      lastName: "Applicant",
      email: "applicant@example.com",
      telephone: "5551234",
    },
    programSnapshot: { name: "Baseball PR" },
    formDefinitionSnapshot: JSON.stringify({
      version,
      isMultiStep: false,
      steps: [
        {
          id: "athlete",
          title: "Athlete",
          icon: "athlete",
          elements:
            version === 1
              ? [
                  {
                    id: "old-name",
                    name: "firstName",
                    label: "Old name",
                    fieldType: "Input",
                    inputType: "text",
                  },
                ]
              : [],
        },
      ],
    }),
    formData: { athlete: { firstName: "Conflicting legacy name" } },
  };
}

function renderHeader(version: 1 | 2) {
  return renderToStaticMarkup(
    <ApplicationHeader
      application={application(version)}
      organizationSlug="test"
      totalDue={0}
      totalPaid={0}
      totalPending={0}
      associatedUser={null}
    />,
  );
}

test("new application headers show the real selected program without invented legacy answers", () => {
  const html = renderHeader(2);
  expect(html).toContain("Baseball PR");
  expect(html).toContain("applicant@example.com");
  expect(html).not.toContain("needsI20");
  expect(html).not.toContain("boarding");
  expect(html).not.toContain("gradeEntering");
});

test("legacy headers keep their existing fields", () => {
  const html = renderHeader(1);
  expect(html).toContain("needsI20");
  expect(html).toContain("boarding");
  expect(html).toContain("gradeEntering");
});

test.each([1, 2] as const)(
  "v%i dynamic edits expose one copy of the applicant fields",
  (version) => {
    const app = application(version);
    const html = renderToStaticMarkup(
      <ApplicationDynamicForm
        application={app}
        applicant={app.applicant}
        formData={app.formData}
        isEditing={true}
        onApplicantChange={vi.fn()}
        onFormDataChange={vi.fn()}
        onValidationChange={vi.fn()}
      />,
    );
    expect(html.match(/value="Original"/g)).toHaveLength(1);
    expect(html).not.toContain("Conflicting legacy name");
    if (version === 2) {
      expect(html).toMatch(/readonly=""[^>]*value="Baseball PR"/i);
    }
  },
);
