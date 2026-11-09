// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { afterEach, expect, test, vi } from "vitest";
import { DataTable } from "./data-table";

vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, values?: { current: number; total: number }) =>
      key === "table.pageInfo"
        ? `Page ${values?.current} of ${values?.total}`
        : key,
}));
afterEach(cleanup);
type Record = { id: string; name: string };
const records = [
  { id: "c", name: "Charlie" },
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
];
const columns: ColumnDef<Record, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <button onClick={() => column.toggleSorting()}>Name</button>
    ),
  },
];

test("the default mode keeps browser filtering, sorting, pagination and exports", async () => {
  const onExport = vi.fn();
  const filtered = vi.fn();
  const result = render(
    <DataTable
      data={records}
      columns={columns}
      pageSize={2}
      filterColumn="name"
      filterPlaceholder="Search"
      onExport={onExport}
      exportButtonLabel="Export"
      onFilteredDataChange={filtered}
    />,
  );
  await waitFor(() => expect(filtered).toHaveBeenCalledWith(records));
  expect(result.getByText("Page 1 of 2")).toBeTruthy();
  expect(result.getByText("Charlie")).toBeTruthy();
  expect(result.queryByText("Beta")).toBeNull();
  fireEvent.click(result.getByRole("button", { name: "Name" }));
  expect(
    within(result.getByRole("table"))
      .getAllByRole("cell")
      .map((cell) => cell.textContent),
  ).toEqual(["Alpha", "Beta"]);
  fireEvent.click(result.getByRole("button", { name: "Go to next page" }));
  expect(result.getByText("Page 2 of 2")).toBeTruthy();
  expect(result.getByText("Charlie")).toBeTruthy();
  fireEvent.change(result.getByPlaceholderText("Search"), {
    target: { value: "Alpha" },
  });
  await waitFor(() => expect(result.getByText("Page 1 of 1")).toBeTruthy());
  expect(result.queryByText("Charlie")).toBeNull();
  expect(filtered).toHaveBeenLastCalledWith([records[1]]);
  fireEvent.click(result.getByRole("button", { name: "Export" }));
  expect(onExport).toHaveBeenCalledWith([records[1]], ["name"]);
});

test("cursor mode displays the supplied page intact and delegates navigation without inventing a total", () => {
  const onPreviousPage = vi.fn();
  const onNextPage = vi.fn();
  const pagination = {
    pageLabel: "Page 3",
    navigationLabel: "Pagination",
    canPreviousPage: true,
    canNextPage: false,
    onPreviousPage,
    onNextPage,
  };
  const result = render(
    <DataTable
      data={records}
      columns={columns}
      pageSize={1}
      getRowId={(row) => row.id}
      initialSorting={[{ id: "name", desc: false }]}
      cursorPagination={pagination}
      previousLabel="Previous"
      nextLabel="Next"
      showColumnSelector={false}
    />,
  );
  expect(
    within(result.getByRole("table"))
      .getAllByRole("cell")
      .map((cell) => cell.textContent),
  ).toEqual(["Charlie", "Alpha", "Beta"]);
  expect(result.getByText("Page 3")).toBeTruthy();
  expect(result.queryByText(/of/)).toBeNull();
  expect(
    (result.getByRole("button", { name: "Next" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(result.getByRole("button", { name: "Previous" }));
  expect(onPreviousPage).toHaveBeenCalledOnce();
  expect(onNextPage).not.toHaveBeenCalled();
  result.rerender(
    <DataTable
      data={[records[0]]}
      columns={columns}
      cursorPagination={{
        ...pagination,
        pageLabel: "Page 2",
        canNextPage: true,
      }}
      previousLabel="Previous"
      nextLabel="Next"
      showColumnSelector={false}
    />,
  );
  expect(result.queryByText("Alpha")).toBeNull();
  fireEvent.click(result.getByRole("button", { name: "Next" }));
  expect(onNextPage).toHaveBeenCalledOnce();
});

test("loading a cursor page disables navigation and does not display an empty result", () => {
  const result = render(
    <DataTable
      data={[]}
      columns={columns}
      isLoading
      loadingMessage="Loading activities"
      emptyMessage="No activities"
      showColumnSelector={false}
      cursorPagination={{
        pageLabel: "Page 2",
        navigationLabel: "Pagination",
        canPreviousPage: true,
        canNextPage: true,
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
      }}
    />,
  );
  expect(result.getByRole("status").textContent).toBe("Loading activities");
  expect(result.queryByText("No activities")).toBeNull();
  expect(
    (
      result.getByRole("button", {
        name: "Go to previous page",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(
    (
      result.getByRole("button", {
        name: "Go to next page",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

test("controlled sorting delegates to the server and keeps the server's row order", () => {
  const onSortingChange = vi.fn();
  const pagination = {
    pageLabel: "Page 1",
    navigationLabel: "Pagination",
    canPreviousPage: false,
    canNextPage: false,
    onPreviousPage: vi.fn(),
    onNextPage: vi.fn(),
  };
  const result = render(
    <DataTable
      data={records}
      columns={columns}
      cursorPagination={pagination}
      sorting={[{ id: "name", desc: false }]}
      onSortingChange={onSortingChange}
      showColumnSelector={false}
    />,
  );
  expect(result.getByRole("columnheader").getAttribute("aria-sort")).toBe(
    "ascending",
  );
  fireEvent.click(result.getByRole("button", { name: "Name" }));
  expect(onSortingChange).toHaveBeenCalledWith([{ id: "name", desc: true }]);
  expect(result.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
    "Charlie",
    "Alpha",
    "Beta",
  ]);
});

test("clickable rows support keyboard activation and ignore action buttons and modified clicks", () => {
  const onRowClick = vi.fn();
  const onAction = vi.fn();
  const actionColumns: ColumnDef<Record, unknown>[] = [
    ...columns,
    { id: "actions", cell: () => <button onClick={onAction}>Action</button> },
  ];
  const result = render(
    <DataTable
      data={[records[0]]}
      columns={actionColumns}
      onRowClick={onRowClick}
      enableKeyboardRowActivation
      showColumnSelector={false}
    />,
  );
  const row = result.getAllByRole("row")[1];
  fireEvent.click(within(row).getByText("Charlie"));
  expect(onRowClick).toHaveBeenCalledExactlyOnceWith(records[0]);
  expect(document.activeElement).toBe(row);
  onRowClick.mockClear();
  fireEvent.click(within(row).getByRole("button", { name: "Action" }));
  expect(onAction).toHaveBeenCalledOnce();
  expect(onRowClick).not.toHaveBeenCalled();
  fireEvent.keyDown(within(row).getByRole("button", { name: "Action" }), {
    key: "Enter",
  });
  expect(onRowClick).not.toHaveBeenCalled();
  fireEvent.click(row, { ctrlKey: true });
  fireEvent.click(row, { button: 2 });
  expect(onRowClick).not.toHaveBeenCalled();
  fireEvent.keyDown(row, { key: " " });
  expect(onRowClick).toHaveBeenCalledExactlyOnceWith(records[0]);
});

test("existing click-only consumers retain their keyboard behavior by default", () => {
  const onRowClick = vi.fn();
  const result = render(
    <DataTable
      data={[records[0]]}
      columns={columns}
      onRowClick={onRowClick}
      showColumnSelector={false}
    />,
  );
  const row = result.getAllByRole("row")[1];
  expect(row.getAttribute("tabindex")).toBeNull();
  fireEvent.keyDown(row, { key: "Enter" });
  expect(onRowClick).not.toHaveBeenCalled();
  fireEvent.click(row);
  expect(onRowClick).toHaveBeenCalledExactlyOnceWith(records[0]);
});
