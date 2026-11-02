// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { ApplicationListItem } from "@/lib/applications/list-types";
import { ApplicationsTable } from "./applications-table";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => undefined,
}));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const row: ApplicationListItem = {
  _id: "application" as ApplicationListItem["_id"],
  organizationId: "organization" as ApplicationListItem["organizationId"],
  _creationTime: 1,
  applicationCode: "APP-TEST",
  status: "pending",
  isArchived: false,
  applicant: {
    firstName: "Student",
    lastName: "Name",
    email: "student@example.com",
    telephone: "555",
  },
  program: { name: "Soccer" },
  account: {
    firstName: "Parent",
    lastName: "Name",
    email: "parent@example.com",
  },
  paymentSummary: {
    totalDue: 0,
    totalPaid: 0,
    totalPending: 0,
    feeCount: 0,
    paidCount: 0,
  },
  formValues: {
    "form:contract": "YES",
    "form:missing": null,
    "form:other": "—",
  },
};
const fields = [
  {
    id: "form:contract",
    label: "Contract",
    section: "Athlete",
    programs: ["Soccer"],
  },
  {
    id: "form:missing",
    label: "Notes",
    section: "Athlete",
    programs: ["Soccer"],
  },
  {
    id: "form:other",
    label: "Other",
    section: "Athlete",
    programs: ["Basketball"],
  },
];

test("the administrative table displays selected form columns and hides base columns consistently", () => {
  const html = renderToStaticMarkup(
    <ApplicationsTable
      applications={[row]}
      organizationSlug="school"
      isAdmin
      tableConfiguration={{
        visibleColumns: ["fullName", ...fields.map((field) => field.id)],
        fields,
      }}
      onColumnsChange={vi.fn()}
    />,
  );
  expect(html).toContain("Student");
  expect(html).toContain("Contract");
  expect(html).toMatch(/<button[^>]*>Contract<svg/);
  expect(html).toContain(">YES</span>");
  expect(html).toContain("summaryNoInformation");
  expect(html).toContain(">—</span>");
  expect(html).not.toContain("Soccer");
  expect(html).not.toContain("Parent");
});

test("unselected custom columns stay hidden and exports wait for newly selected values", () => {
  const html = renderToStaticMarkup(
    <ApplicationsTable
      applications={[{ ...row, formValues: undefined }]}
      organizationSlug="school"
      isAdmin
      tableConfiguration={{
        visibleColumns: ["fullName", "form:contract"],
        fields,
      }}
      onColumnsChange={vi.fn()}
    />,
  );
  expect(html).toContain("Contract");
  expect(html).not.toContain("Notes");
  expect(html).toContain(">…</span>");
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?export/);
});
