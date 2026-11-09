import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
}

export interface CursorPagination {
  pageLabel: string;
  navigationLabel: string;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (row: TData) => string;
  cursorPagination?: CursorPagination;
  isLoading?: boolean;
  loadingMessage?: string;
  variant?: "default" | "plain";
  showColumnSelector?: boolean;
  ariaLabel?: string;
  filterColumn?: string;
  filterPlaceholder?: string;
  emptyMessage?: string;
  columnsMenuLabel?: string;
  columnLabels?: Record<string, string>;
  columnGroups?: Record<string, string>;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  exportDisabled?: boolean;
  exportButtonLabel?: string;
  filterConfigs?: FilterConfig[];
  filtersMenuLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  selectedRowsLabel?: (selected: number, total: number) => string;
  resultsCountLabel?: (
    filtered: number,
    total: number,
    isFiltered: boolean,
  ) => string;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  initialSorting?: SortingState;
  pageSize?: number;
  enableRowSelection?: boolean;
  onCreate?: () => void;
  onExport?: (rows: TData[], visibleColumnIds: string[]) => void;
  onFilteredDataChange?: (rows: TData[]) => void;
  onRowClick?: (row: TData) => void;
  enableKeyboardRowActivation?: boolean;
  renderBulkActions?: (
    selectedRows: TData[],
    clearSelection: () => void,
  ) => ReactNode;
  renderRowContextMenu?: (row: TData) => ReactNode;
}

export type Translator = (key: string) => string;
