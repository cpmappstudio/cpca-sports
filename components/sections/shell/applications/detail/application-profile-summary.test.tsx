// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { Application } from "@/lib/applications/types";
import type { ProgramFormDefinition } from "@/components/sections/shell/programs/create/form-builder/types";
import { ApplicationProfileSummary } from "./application-profile-summary";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const i20Options = [
  {
    id: "citizen",
    value: "no-citizen",
    label: "No. I am USA Citizen / Resident",
    translation: "i20NoCitizen",
  },
  {
    id: "non-citizen",
    value: "no-non-citizen",
    label: "No. I don't need it and i am not citizen",
    translation: "i20NoNonCitizen",
  },
  {
    id: "new",
    value: "yes-new",
    label: "Yes. I need a new I-20",
    translation: "i20YesNew",
  },
  {
    id: "transfer",
    value: "yes-transfer",
    label: "Yes. I need to transfer my I-20 to CPCA",
    translation: "i20YesTransfer",
  },
];

function fixture() {
  const definition: ProgramFormDefinition = {
    version: 1,
    isMultiStep: false,
    steps: [
      {
        id: "athlete",
        title: "Athlete",
        icon: "athlete",
        elements: [
          {
            id: "contract",
            name: "select_a8f3",
            label: "Contract",
            fieldType: "Select",
            options: [
              { id: "yes", label: "YES", value: "YES" },
              { id: "no", label: "NO", value: "NO" },
            ],
          },
          {
            id: "i20",
            name: "needsI20",
            label: "Do you need an I-20?",
            fieldType: "Select",
            options: i20Options.map(({ id, value, label }) => ({
              id,
              value,
              label,
            })),
          },
          {
            id: "score",
            name: "score",
            label: "Score",
            fieldType: "Input",
            inputType: "number",
          },
          {
            id: "consent",
            name: "consent",
            label: "Consent",
            fieldType: "Checkbox",
          },
        ],
      },
    ],
  };
  const app: Application = {
    _id: "application" as Id<"applications">,
    _creationTime: 1,
    organizationId: "organization" as Id<"organizations">,
    userId: "user" as Id<"users">,
    applicationCode: "APP-TEST",
    status: "pending",
    programSnapshot: { name: "Soccer" },
    formData: {
      athlete: {
        select_a8f3: "YES",
        needsI20: "yes-transfer",
        score: 0,
        consent: false,
      },
    },
    formDefinitionSnapshot: JSON.stringify(definition),
    summaryConfiguration: { formDefinition: JSON.stringify(definition) },
  };
  return { app, definition };
}

test("default summary shows Contract and the selected I-20 option", () => {
  const { app } = fixture();
  const html = renderToStaticMarkup(
    <ApplicationProfileSummary application={app} />,
  );
  expect(html).toContain("Soccer");
  expect(html).toContain("Contract:");
  expect(html).toContain(">YES</span>");
  expect(html).toContain("Yes. I need to transfer my I-20 to CPCA");
  expect(html).not.toContain("Score:");
});

test("custom fields use type icons while I-20 keeps its specific icon", () => {
  const { app } = fixture();
  app.summaryConfiguration!.fields = ["contract", "score", "consent", "i20"];
  const html = renderToStaticMarkup(
    <ApplicationProfileSummary application={app} />,
  );
  expect(html.match(/lucide-list-filter/g)).toHaveLength(1);
  expect(html).toContain("lucide-hash");
  expect(html).toContain("lucide-square-check-big");
  expect(html).toContain("lucide-id-card");
  expect(html).not.toContain("lucide-file-text");
});

test.each([
  ["text", "lucide-text-cursor-input"],
  ["url", "lucide-link"],
  ["email", "lucide-mail"],
  ["tel", "lucide-phone"],
] as const)(
  "a custom %s input uses its type icon even without an answer",
  (inputType, iconClass) => {
    const { app, definition } = fixture();
    definition.steps[0].elements.push({
      id: "custom-input",
      name: "customInput",
      label: "Custom input",
      fieldType: "Input",
      inputType,
    });
    app.summaryConfiguration = {
      formDefinition: JSON.stringify(definition),
      fields: ["custom-input"],
    };
    const html = renderToStaticMarkup(
      <ApplicationProfileSummary application={app} />,
    );
    expect(html).toContain(iconClass);
    expect(html).toContain("summaryNoInformation");
    expect(html).not.toContain("lucide-file-text");
  },
);

test.each(i20Options)(
  "I-20 displays the selected option for $value with or without a snapshot",
  ({ value, label }) => {
    const { app } = fixture();
    app.formData.athlete.needsI20 = value;
    for (const snapshot of [app.formDefinitionSnapshot, undefined]) {
      app.formDefinitionSnapshot = snapshot;
      const html = renderToStaticMarkup(
        <ApplicationProfileSummary application={app} />,
      );
      expect(html).toContain(label.replaceAll("'", "&#x27;"));
      expect(html).not.toMatch(/needsI20:<\/span><span[^>]*>no<\/span>/);
    }
  },
);

test.each(i20Options)(
  "legacy I-20 answers retain their meaning for $value without form metadata",
  ({ value, translation }) => {
    const { app } = fixture();
    delete app.summaryConfiguration;
    delete app.formDefinitionSnapshot;
    app.formData.athlete.needsI20 = value;
    const html = renderToStaticMarkup(
      <ApplicationProfileSummary application={app} />,
    );
    expect(html).toContain(`>${translation}</span>`);
  },
);

test.each([true, false])(
  "a missing I-20 answer is not interpreted as No (configured: %s)",
  (configured) => {
    const { app } = fixture();
    if (!configured) delete app.summaryConfiguration;
    delete app.formData.athlete.needsI20;
    const html = renderToStaticMarkup(
      <ApplicationProfileSummary application={app} />,
    );
    expect(html).toMatch(
      /needsI20:<\/span><span[^>]*>summaryNoInformation<\/span>/,
    );
  },
);

test("I-20 uses the original selected option label when the program options change", () => {
  const { app, definition } = fixture();
  const i20 = definition.steps[0].elements.find(
    (field) => field.name === "needsI20",
  );
  if (i20?.fieldType === "Select")
    i20.options.find((option) => option.value === "yes-transfer")!.label =
      "Changed option";
  app.summaryConfiguration!.formDefinition = JSON.stringify(definition);
  const html = renderToStaticMarkup(
    <ApplicationProfileSummary application={app} />,
  );
  expect(html).toContain("Yes. I need to transfer my I-20 to CPCA");
  expect(html).not.toContain("Changed option");
});

test("custom selection only shows chosen fields and preserves zero and false answers", () => {
  const { app } = fixture();
  app.summaryConfiguration!.fields = ["score", "consent"];
  const html = renderToStaticMarkup(
    <ApplicationProfileSummary application={app} />,
  );
  expect(html).toContain("Score:");
  expect(html).toContain(">0</span>");
  expect(html).toContain("Consent:");
  expect(html).toContain(">no</span>");
  expect(html).not.toContain("Contract:");
  expect(html).not.toContain("needsI20:");
});

test("an empty configuration keeps the program and hides optional summary fields", () => {
  const { app } = fixture();
  app.summaryConfiguration!.fields = [];
  const html = renderToStaticMarkup(
    <ApplicationProfileSummary application={app} />,
  );
  expect(html).toContain("Soccer");
  expect(html).not.toContain("Contract:");
  expect(html).not.toContain("needsI20:");
});

test("applications without snapshots use current field metadata and show missing answers explicitly", () => {
  const { app } = fixture();
  delete app.formDefinitionSnapshot;
  let html = renderToStaticMarkup(
    <ApplicationProfileSummary application={app} />,
  );
  expect(html).toContain(">YES</span>");
  delete app.formData.athlete.select_a8f3;
  html = renderToStaticMarkup(<ApplicationProfileSummary application={app} />);
  expect(html).toMatch(
    /Contract:<\/span><span[^>]*>summaryNoInformation<\/span>/,
  );
});

test("summary uses the saved option labels for existing answers", () => {
  const { app, definition } = fixture();
  const contract = definition.steps[0].elements[0];
  if (contract.fieldType === "Select")
    contract.options[0].label = "New option label";
  app.summaryConfiguration!.formDefinition = JSON.stringify(definition);
  const html = renderToStaticMarkup(
    <ApplicationProfileSummary application={app} />,
  );
  expect(html).toContain(">YES</span>");
  expect(html).not.toContain("New option label");
});

test("a program without Contract never invents a summary row from another program's data", () => {
  const { app, definition } = fixture();
  definition.steps[0].elements = definition.steps[0].elements.filter(
    (field) => field.id !== "contract",
  );
  app.summaryConfiguration!.formDefinition = JSON.stringify(definition);
  const html = renderToStaticMarkup(
    <ApplicationProfileSummary application={app} />,
  );
  expect(html).not.toContain("Contract:");
});
