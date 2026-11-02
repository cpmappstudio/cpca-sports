import { expect, test } from "vitest";
import type { ApplicationListItem } from "./list-types";
import {
  convertApplicationsToCSV,
  formatApplicationTableValue,
  getApplicationFieldSortValue,
  compareApplicationTableValues,
} from "./table-values";
import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";

const copy = { yes: "Sí", no: "No", missing: "Sin datos" };
function row(): ApplicationListItem {
  return {
    _id: "application" as ApplicationListItem["_id"],
    _creationTime: Date.UTC(2026, 0, 1),
    organizationId: "organization" as ApplicationListItem["organizationId"],
    applicationCode: "HIDDEN-CODE",
    status: "pending",
    isArchived: false,
    applicant: {
      firstName: "Student",
      lastName: "Name",
      email: "hidden@example.com",
      telephone: "555",
    },
    program: { name: "Soccer" },
    account: {
      firstName: "Parent",
      lastName: "Name",
      email: "parent@example.com",
    },
    paymentSummary: {
      totalDue: 100,
      totalPaid: 25,
      totalPending: 75,
      feeCount: 1,
      paidCount: 0,
    },
    formValues: {
      "form:contract": "YES",
      "form:number": 0,
      "form:checkbox": false,
      "form:missing": null,
      "form:other-program": "—",
    },
  };
}
const options = {
  ...copy,
  labels: {
    fullName: "Nombre",
    "form:contract": "Contract",
    "form:number": "Puntos",
    "form:checkbox": "Acepta",
    "form:missing": "Sin respuesta",
    "form:other-program": "Otro programa",
    status: "Estado",
  },
  locale: "es",
  noFees: "Sin cobros",
  statuses: {
    pending: "Pendiente",
    reviewing: "En revisión",
    "pre-admitted": "Preadmitido",
    admitted: "Admitido",
    denied: "Rechazado",
  },
};

test("exports only visible columns in the requested order with their displayed values", () => {
  const csv = convertApplicationsToCSV(
    [row()],
    [
      "form:contract",
      "fullName",
      "status",
      "form:number",
      "form:checkbox",
      "form:missing",
      "form:other-program",
    ],
    options,
  );
  expect(csv).toBe(
    '"Contract","Nombre","Estado","Puntos","Acepta","Sin respuesta","Otro programa"\n"YES","Student Name","Pendiente","0","No","Sin datos","—"',
  );
  expect(csv).not.toContain("HIDDEN-CODE");
  expect(csv).not.toContain("hidden@example.com");
});

test("CSV escapes quotes, commas and line breaks and prevents formula execution", () => {
  const app = row();
  app.applicant.firstName = 'A, "quoted"\nname';
  app.formValues!["form:contract"] = '=HYPERLINK("example.com")';
  const csv = convertApplicationsToCSV(
    [app],
    ["fullName", "form:contract"],
    options,
  );
  expect(csv).toContain('"A, ""quoted""\nname Name"');
  expect(csv).toContain('"\'=HYPERLINK(""example.com"")"');
});

test("missing, not applicable, zero and false have distinct table representations", () => {
  expect(formatApplicationTableValue(undefined, copy)).toBe("…");
  expect(formatApplicationTableValue(null, copy)).toBe("Sin datos");
  expect(formatApplicationTableValue("—", copy)).toBe("—");
  expect(formatApplicationTableValue(0, copy)).toBe("0");
  expect(formatApplicationTableValue(false, copy)).toBe("No");
});

test("payment exports match the table for zero-value charges and applications without charges", () => {
  const app = row();
  app.paymentSummary = {
    totalDue: 0,
    totalPaid: 0,
    totalPending: 0,
    feeCount: 1,
    paidCount: 0,
  };
  expect(
    convertApplicationsToCSV([app], ["paymentProgress"], options),
  ).toContain('"0%"');
  app.paymentSummary.feeCount = 0;
  expect(
    convertApplicationsToCSV([app], ["paymentProgress"], options),
  ).toContain('"Sin cobros"');
});

test("an empty selection does not create an empty CSV and a list without rows retains its headers", () => {
  expect(convertApplicationsToCSV([row()], [], options)).toBe("");
  expect(convertApplicationsToCSV([], ["fullName"], options)).toBe('"Nombre"');
});

function sortRows(data: ApplicationListItem[], desc: boolean) {
  const table = createTable({
    data,
    columns: [
      {
        id: "field",
        accessorFn: (row) => getApplicationFieldSortValue(row, "form:value"),
        sortUndefined: "last",
        sortingFn: (left, right, id) =>
          compareApplicationTableValues(
            left.getValue(id),
            right.getValue(id),
            "es",
          ),
      },
    ],
    state: { sorting: [{ id: "field", desc }] },
    onStateChange: () => {},
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return table.getSortedRowModel().rows.map((row) => row.original);
}

test.each([false, true])(
  "numeric fields sort numerically with missing and non-applicable answers last (descending: %s)",
  (desc) => {
    const data = [null, 10, "—", 0, 2.5, -1].map((value) => ({
      ...row(),
      formValues: { "form:value": value },
    }));
    const sorted = sortRows(data, desc).map(
      (row) => row.formValues!["form:value"],
    );
    expect(sorted).toEqual(
      desc ? [10, 2.5, 0, -1, null, "—"] : [-1, 0, 2.5, 10, null, "—"],
    );
  },
);

test("selected text and boolean fields can sort in either direction", () => {
  const text = ["YES", null, "NO"].map((value) => ({
    ...row(),
    formValues: { "form:value": value },
  }));
  expect(
    sortRows(text, false).map((row) => row.formValues!["form:value"]),
  ).toEqual(["NO", "YES", null]);
  expect(
    sortRows(text, true).map((row) => row.formValues!["form:value"]),
  ).toEqual(["YES", "NO", null]);
  const boolean = [true, null, false].map((value) => ({
    ...row(),
    formValues: { "form:value": value },
  }));
  expect(
    sortRows(boolean, false).map((row) => row.formValues!["form:value"]),
  ).toEqual([false, true, null]);
  expect(
    sortRows(boolean, true).map((row) => row.formValues!["form:value"]),
  ).toEqual([true, false, null]);
});

test("date fields sort chronologically while their displayed values and CSV remain unchanged", () => {
  const data = [
    {
      ...row(),
      formValues: { "form:value": "Dec 31, 2026" },
      formSortValues: { "form:value": Date.UTC(2026, 11, 31) },
    },
    {
      ...row(),
      formValues: { "form:value": "Feb 1, 2026" },
      formSortValues: { "form:value": Date.UTC(2026, 1, 1) },
    },
    {
      ...row(),
      formValues: { "form:value": "Jan 1, 2027" },
      formSortValues: { "form:value": Date.UTC(2027, 0, 1) },
    },
  ];
  const sorted = sortRows(data, false);
  expect(sorted.map((row) => row.formValues!["form:value"])).toEqual([
    "Feb 1, 2026",
    "Dec 31, 2026",
    "Jan 1, 2027",
  ]);
  const csv = convertApplicationsToCSV(sorted, ["form:value"], options);
  expect(csv).toContain('"Feb 1, 2026"\n"Dec 31, 2026"\n"Jan 1, 2027"');
  expect(csv).not.toContain(String(Date.UTC(2026, 1, 1)));
});
