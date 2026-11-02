// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { createTable, getCoreRowModel } from "@tanstack/react-table";
import { expect, test, vi } from "vitest";
import { DataTableColumns } from "./data-table-columns";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { column: string }) => {
    if (key === "showColumn") return `Show ${values?.column}`;
    if (key === "hideColumn") return `Hide ${values?.column}`;
    return key;
  },
}));
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

function Selector() {
  const table = createTable({
    data: [],
    columns: [
      { id: "fullName", accessorFn: () => "" },
      { id: "form:contract", accessorFn: () => "" },
      { id: "internal-filter", accessorFn: () => "", enableHiding: false },
    ],
    state: { columnVisibility: { fullName: true, "form:contract": false } },
    onStateChange: () => {},
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <DataTableColumns
      table={table}
      label="Columns"
      labels={{ fullName: "Full Name", "form:contract": "Contract" }}
      groups={{ fullName: "General", "form:contract": "Athlete Information" }}
    />
  );
}

test("the selector includes search, form sections and clear visibility actions without internal filter columns", () => {
  const html = renderToStaticMarkup(<Selector />);
  expect(html).toContain('placeholder="searchColumns"');
  expect(html).toContain("General");
  expect(html).toContain("Athlete Information");
  expect(html).toContain('aria-label="Hide Full Name"');
  expect(html).toContain('aria-label="Show Contract"');
  expect(html).not.toContain("internal-filter");
});
