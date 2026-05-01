import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  LuBadgeCheck,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuCircleDot,
  LuFileText,
  LuLink,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSlidersHorizontal,
} from "react-icons/lu";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { CONTRACT_ACCOUNTS, CONTRACT_LINES, PROJECTS } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import type {
  ContractAccount,
  ContractLine,
  ContractLineDocumentStatus,
  ContractLineStatus,
  Project,
} from "~/data/mockData";

type StatusFilter = ContractLineStatus | "All";
type PaginationItem = number | "ellipsis";
type ContractLineFormValues = {
  lineNumber: string;
  lineName: string;
  vendorName: string;
  accountId: string;
  projectId: string;
  serviceItem: string;
  startDate: string;
  endDate: string;
  status: ContractLineStatus;
  documentStatus: ContractLineDocumentStatus;
  notes: string;
};
type ContractLineRow = ContractLine & {
  accountNumber: string;
  accountName: string;
  projectCode: string;
  projectName: string;
};
type SearchableOption = {
  value: string;
  label: string;
  description?: string;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const statusFilters: StatusFilter[] = ["All", "Active", "Inactive"];
const lineStatuses: ContractLineStatus[] = ["Active", "Inactive"];
const documentStatuses: ContractLineDocumentStatus[] = [
  "Draft",
  "Document Verification",
  "Writing Hardcopy",
  "Hardcopy Sent",
  "Signed",
  "Archived",
];

export function meta() {
  return [
    { title: "Contract Lines | EDC.OS" },
    {
      name: "description",
      content: "Vendor EDC contract line workspace linked to accounts and projects.",
    },
  ];
}

function getPaginationItems(
  pageCount: number,
  currentPage: number,
): PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pageSet = new Set<number>([1, pageCount, currentPage]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pageSet.add(page));
  } else if (currentPage >= pageCount - 3) {
    [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1].forEach(
      (page) => pageSet.add(page),
    );
  } else {
    [currentPage - 1, currentPage + 1].forEach((page) => pageSet.add(page));
  }

  const pages = Array.from(pageSet)
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  return pages.flatMap<PaginationItem>((page, index) => {
    const previousPage = pages[index - 1];

    if (previousPage && page - previousPage > 1) {
      return ["ellipsis", page];
    }

    return [page];
  });
}

function getPinnedColumnStyles(column: Column<ContractLineRow>): CSSProperties {
  const isPinned = column.getIsPinned();
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right");

  return {
    background: isPinned ? "#fff" : undefined,
    boxShadow: isFirstRightPinnedColumn
      ? "4px 0 8px -6px rgba(14, 39, 72, 0.65) inset"
      : undefined,
    minWidth: column.columnDef.size,
    opacity: isPinned ? 0.98 : 1,
    position: isPinned ? "sticky" : "relative",
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    width: column.columnDef.size,
    zIndex: isPinned ? 10 : 0,
  };
}

function getAccountMap(accounts: ContractAccount[]) {
  return Object.fromEntries(accounts.map((account) => [account.id, account]));
}

function getProjectMap(projects: Project[]) {
  return Object.fromEntries(projects.map((project) => [project.id, project]));
}

function IconPageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      variant="outline"
      size="icon"
    >
      {children}
    </Button>
  );
}

function RowsPerPageDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="relative block min-w-36">
      <LuSlidersHorizontal
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-accent"
        strokeWidth={1.75}
      />
      <span className="sr-only">Rows per page</span>
      <Select
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full pl-9"
        data-testid="contract-line-page-size"
      >
        {PAGE_SIZE_OPTIONS.map((pageSize) => (
          <option key={pageSize} value={pageSize}>
            Rows {pageSize}
          </option>
        ))}
      </Select>
    </label>
  );
}

function StatusBadge({ status }: { status: ContractLineStatus }) {
  const variantMap: Record<ContractLineStatus, "success" | "secondary"> = {
    Active: "success",
    Inactive: "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
      {status}
    </Badge>
  );
}

function DocumentStatusBadge({
  status,
}: {
  status: ContractLineDocumentStatus;
}) {
  const variantMap: Record<
    ContractLineDocumentStatus,
    "success" | "warning" | "secondary" | "outline"
  > = {
    Archived: "secondary",
    "Document Verification": "warning",
    Draft: "outline",
    "Hardcopy Sent": "warning",
    Signed: "success",
    "Writing Hardcopy": "warning",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-36 justify-center">
      {status}
    </Badge>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: IconType;
  tone?: "default" | "good" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-emerald-700",
    warning: "text-amber-700",
  }[tone];

  return (
    <Card className="min-w-0">
      <CardContent className="px-4 py-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
          <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function SearchableSelect({
  label,
  value,
  options,
  placeholder,
  testId,
  onChange,
}: {
  label: string;
  value: string;
  options: SearchableOption[];
  placeholder: string;
  testId: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedQuery) return true;

    return [option.label, option.description]
      .filter(Boolean)
      .some((item) => item?.toLowerCase().includes(normalizedQuery));
  });

  return (
    <div className="relative grid min-w-0 gap-2">
      <span className="text-xs font-semibold text-foreground/65">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-border bg-white px-3 text-left text-sm font-semibold text-foreground outline-none transition-colors hover:border-accent hover:bg-muted/20 focus:border-accent focus-visible:ring-2 focus-visible:ring-ring"
        data-testid={`${testId}-trigger`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedOption?.label ?? placeholder}
        </span>
        <LuSlidersHorizontal
          className="ml-2 h-4 w-4 shrink-0 text-accent"
          strokeWidth={1.75}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-[90] mt-2 rounded-md border border-border bg-white p-2 shadow-lg">
          <label className="relative block">
            <span className="sr-only">Search {label}</span>
            <LuSearch
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-accent"
              strokeWidth={1.75}
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="pl-9"
              data-testid={`${testId}-search`}
            />
          </label>

          <div className="mt-2 max-h-48 overflow-y-auto">
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`grid w-full min-w-0 gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70 ${
                    option.value === value ? "bg-muted text-accent" : "text-foreground"
                  }`}
                  data-testid={`${testId}-option-${option.value}`}
                >
                  <span className="truncate font-semibold">{option.label}</span>
                  {option.description ? (
                    <span className="truncate text-xs text-foreground/55">
                      {option.description}
                    </span>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-sm text-foreground/55">
                No options found.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getNextLineNumber(lines: ContractLine[]) {
  const year = new Date().getFullYear();
  const nextSequence =
    lines.reduce((highest, line) => {
      const match = line.lineNumber.match(/^CL-(\d{4})-(\d+)$/);

      if (!match || Number(match[1]) !== year) return highest;

      return Math.max(highest, Number(match[2]));
    }, 0) + 1;

  return `CL-${year}-${String(nextSequence).padStart(4, "0")}`;
}

function getLineId(
  lineNumber: string,
  lineName: string,
  existingIds: Set<string>,
) {
  const slug = (lineNumber || lineName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const baseId = `cl-${slug || Date.now()}`;

  if (!existingIds.has(baseId)) return baseId;

  let index = existingIds.size + 1;
  let nextId = `${baseId}-${index}`;

  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getContractLineFormValues(
  line: ContractLine | undefined,
  generatedLineNumber: string,
): ContractLineFormValues {
  return {
    lineNumber: line?.lineNumber ?? generatedLineNumber,
    lineName: line?.lineName ?? "",
    vendorName: line?.vendorName ?? "EDC Vendor Nusantara",
    accountId: line?.accountId ?? CONTRACT_ACCOUNTS[0]?.id ?? "",
    projectId: line?.projectId ?? PROJECTS[0]?.id ?? "",
    serviceItem: line?.serviceItem ?? "",
    startDate: line?.startDate ?? getTodayDate(),
    endDate: line?.endDate ?? getTodayDate(),
    status: line?.status ?? "Active",
    documentStatus: line?.documentStatus ?? "Draft",
    notes: line?.notes ?? "",
  };
}

function ContractLineDialog({
  mode,
  line,
  generatedLineNumber,
  open,
  onClose,
  onSave,
}: {
  mode: "create" | "update";
  line?: ContractLine;
  generatedLineNumber: string;
  open: boolean;
  onClose: () => void;
  onSave: (line: ContractLine) => void;
}) {
  const accountOptions = useMemo<SearchableOption[]>(
    () =>
      CONTRACT_ACCOUNTS.map((account) => ({
        value: account.id,
        label: `${account.accountNumber} - ${account.accountName}`,
        description: `${account.billingName} / ${account.status}`,
      })),
    [],
  );
  const projectOptions = useMemo<SearchableOption[]>(
    () =>
      PROJECTS.map((project) => ({
        value: project.id,
        label: `${project.code} - ${project.name}`,
        description: `${project.description} / ${project.status}`,
      })),
    [],
  );
  const form = useForm({
    defaultValues: getContractLineFormValues(line, generatedLineNumber),
    onSubmit: ({ value }) => {
      onSave({
        id: line?.id ?? "",
        lineNumber: value.lineNumber.trim(),
        lineName: value.lineName.trim(),
        vendorName: value.vendorName.trim(),
        accountId: value.accountId,
        projectId: value.projectId,
        serviceItem: value.serviceItem.trim(),
        startDate: value.startDate,
        endDate: value.endDate,
        status: value.status,
        documentStatus: value.documentStatus,
        notes: value.notes.trim(),
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="max-h-[min(48rem,calc(100vh-2rem))] max-w-5xl">
        <form
          className="flex max-h-[inherit] flex-col overflow-hidden"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Contract Line
            </p>
            <DialogTitle>
              {mode === "create" ? "Add Contract Line" : "Update Contract Line"}
            </DialogTitle>
            <DialogDescription>
              Manage vendor EDC contract lines and connect them to account and
              project records.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 overflow-y-auto p-5">
            <div className="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)_12rem]">
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Line number
                </span>
                <form.Field name="lineNumber">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="CL-2026-0001"
                      data-testid="contract-line-number-input"
                    />
                  )}
                </form.Field>
              </label>
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Line name
                </span>
                <form.Field name="lineName">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Monthly rental - Jabodetabek"
                      data-testid="contract-line-name-input"
                    />
                  )}
                </form.Field>
              </label>
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Status
                </span>
                <form.Field name="status">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value as ContractLineStatus)
                      }
                      data-testid="contract-line-status-select"
                    >
                      {lineStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  )}
                </form.Field>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Document Status
                </span>
                <form.Field name="documentStatus">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(
                          event.target.value as ContractLineDocumentStatus,
                        )
                      }
                      data-testid="contract-line-document-status-select"
                    >
                      {documentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  )}
                </form.Field>
              </label>
              <div className="hidden sm:block" />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="grid min-w-0 gap-2 lg:col-span-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Vendor EDC
                </span>
                <form.Field name="vendorName">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="EDC Vendor Nusantara"
                      data-testid="contract-line-vendor-input"
                    />
                  )}
                </form.Field>
              </label>
              <form.Field name="accountId">
                {(field) => (
                  <SearchableSelect
                    label="Account"
                    value={field.state.value}
                    options={accountOptions}
                    placeholder="Select account"
                    testId="contract-line-account"
                    onChange={field.handleChange}
                  />
                )}
              </form.Field>
              <form.Field name="projectId">
                {(field) => (
                  <SearchableSelect
                    label="Project"
                    value={field.state.value}
                    options={projectOptions}
                    placeholder="Select project"
                    testId="contract-line-project"
                    onChange={field.handleChange}
                  />
                )}
              </form.Field>
            </div>

            <div className="grid gap-4">
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Service item
                </span>
                <form.Field name="serviceItem">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="EDC terminal rental and maintenance"
                      data-testid="contract-line-service-item-input"
                    />
                  )}
                </form.Field>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Start date
                </span>
                <form.Field name="startDate">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      type="date"
                      data-testid="contract-line-start-date-input"
                    />
                  )}
                </form.Field>
              </label>
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  End date
                </span>
                <form.Field name="endDate">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      type="date"
                      data-testid="contract-line-end-date-input"
                    />
                  )}
                </form.Field>
              </label>
            </div>

            <label className="grid min-w-0 gap-2">
              <span className="text-xs font-semibold text-foreground/65">
                Notes
              </span>
              <form.Field name="notes">
                {(field) => (
                  <textarea
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Internal notes for this contract line"
                    className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 focus:border-accent focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="contract-line-notes-input"
                  />
                )}
              </form.Field>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => state.values}>
              {(values) => (
                <Button
                  type="submit"
                  disabled={
                    !values.lineNumber.trim() ||
                    !values.lineName.trim() ||
                    !values.vendorName.trim() ||
                    !values.accountId ||
                    !values.projectId ||
                    !values.serviceItem.trim() ||
                    !values.startDate ||
                    !values.endDate ||
                    !values.status ||
                    !values.documentStatus
                  }
                  data-testid="save-contract-line-button"
                >
                  {mode === "create" ? "Add Contract Line" : "Save Changes"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ContractLines() {
  const [lines, setLines] = useState<ContractLine[]>(CONTRACT_LINES);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<ContractLine | null>(null);

  const accountById = useMemo(() => getAccountMap(CONTRACT_ACCOUNTS), []);
  const projectById = useMemo(() => getProjectMap(PROJECTS), []);
  const generatedLineNumber = useMemo(() => getNextLineNumber(lines), [lines]);
  const tableData = useMemo<ContractLineRow[]>(
    () =>
      lines
        .filter((line) =>
          statusFilter === "All" ? true : line.status === statusFilter,
        )
        .map((line) => {
          const account = accountById[line.accountId];
          const project = projectById[line.projectId];

          return {
            ...line,
            accountName: account?.accountName ?? "Unassigned account",
            accountNumber: account?.accountNumber ?? "-",
            projectCode: project?.code ?? "-",
            projectName: project?.name ?? "Unassigned project",
          };
        }),
    [accountById, lines, projectById, statusFilter],
  );

  const columns = useMemo<ColumnDef<ContractLineRow>[]>(
    () => [
      {
        id: "line",
        accessorFn: (row) => `${row.lineNumber} ${row.lineName}`,
        header: "Contract Line",
        size: 300,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.lineName}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-accent">
              {row.original.lineNumber}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "vendorName",
        id: "vendorName",
        header: "Vendor EDC",
        size: 220,
      },
      {
        id: "account",
        accessorFn: (row) => `${row.accountNumber} ${row.accountName}`,
        header: "Account",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.accountName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.accountNumber}
            </p>
          </div>
        ),
      },
      {
        id: "project",
        accessorFn: (row) => `${row.projectCode} ${row.projectName}`,
        header: "Project",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.projectName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.projectCode}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "serviceItem",
        id: "serviceItem",
        header: "Service Item",
        size: 280,
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">
            {row.original.serviceItem}
          </span>
        ),
      },
      {
        id: "period",
        accessorFn: (row) => `${row.startDate} ${row.endDate}`,
        header: "Period",
        size: 220,
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">
            {row.original.startDate} - {row.original.endDate}
          </span>
        ),
      },
      {
        accessorKey: "documentStatus",
        id: "documentStatus",
        header: "Document Status",
        size: 190,
        cell: ({ row }) => (
          <DocumentStatusBadge status={row.original.documentStatus} />
        ),
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        size: 140,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Action",
        size: 140,
        enableGlobalFilter: false,
        enablePinning: true,
        cell: ({ row }) => (
          <Button
            onClick={() => setSelectedLine(row.original)}
            size="sm"
            aria-label={`Update ${row.original.lineName}`}
            data-testid={`update-contract-line-${row.original.id}`}
          >
            <LuPencil className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Update
          </Button>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      columnPinning,
      globalFilter,
      pagination,
    },
    onColumnPinningChange: setColumnPinning,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const paginationItems = useMemo(
    () => getPaginationItems(pageCount, currentPage),
    [currentPage, pageCount],
  );
  const activeLines = lines.filter((line) => line.status === "Active").length;
  const inactiveLines = lines.filter((line) => line.status === "Inactive").length;
  const linkedLines = lines.filter(
    (line) => line.accountId && line.projectId,
  ).length;
  const signedLines = lines.filter((line) => line.documentStatus === "Signed").length;

  const createLine = (line: ContractLine) => {
    const id = getLineId(
      line.lineNumber,
      line.lineName,
      new Set(lines.map((item) => item.id)),
    );

    setLines((current) => [...current, { ...line, id }]);
    setCreateOpen(false);
  };

  const updateLine = (line: ContractLine) => {
    if (!selectedLine) return;

    setLines((current) =>
      current.map((item) =>
        item.id === selectedLine.id
          ? {
              ...item,
              ...line,
              id: selectedLine.id,
            }
          : item,
      ),
    );
    setSelectedLine(null);
  };

  return (
    <div className="animate-fade-up space-y-6" data-testid="contract-lines-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Contract Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Contract Lines
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Manage vendor EDC contract lines and connect each line to the account
            and project that will drive downstream distribution.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile label="Lines" value={lines.length} icon={LuFileText} />
          <MetricTile
            label="Active"
            value={activeLines}
            icon={LuBadgeCheck}
            tone="good"
          />
          <MetricTile
            label="Inactive"
            value={inactiveLines}
            icon={LuSlidersHorizontal}
            tone={inactiveLines ? "warning" : "default"}
          />
          <MetricTile label="Linked" value={linkedLines} icon={LuLink} />
          <MetricTile label="Signed" value={signedLines} icon={LuFileText} />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuCircleDot className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Contract Line List
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search contract lines</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search line, account, project..."
                className="pl-9"
                data-testid="contract-line-search-input"
              />
            </label>

            <label className="relative block min-w-0 sm:w-48">
              <LuSlidersHorizontal
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <span className="sr-only">Filter contract line status</span>
              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  table.setPageIndex(0);
                }}
                className="w-full pl-9"
                data-testid="contract-line-status-filter"
              >
                {statusFilters.map((status) => (
                  <option key={status} value={status}>
                    {status === "All" ? "All Status" : status}
                  </option>
                ))}
              </Select>
            </label>

            <RowsPerPageDropdown
              value={table.getState().pagination.pageSize}
              onChange={(pageSize) => table.setPageSize(pageSize)}
            />
            <Button
              onClick={() => setCreateOpen(true)}
              data-testid="create-contract-line-button"
            >
              <LuPlus className="h-4 w-4" strokeWidth={1.75} />
              Add Line
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table style={{ minWidth: table.getTotalSize() }}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-background">
                  {headerGroup.headers.map((header) => {
                    const pinnedStyles = getPinnedColumnStyles(header.column);

                    return (
                      <TableHead
                        key={header.id}
                        style={{ ...pinnedStyles, background: "#F6F7F9" }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={getPinnedColumnStyles(cell.column)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-foreground/60"
                  >
                    No contract lines match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/60">
            Page{" "}
            <span className="font-semibold text-foreground">
              {pageCount ? currentPage : 0}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {pageCount || 0}
            </span>
          </p>

          <div className="flex max-w-full items-center gap-2 overflow-x-auto">
            <IconPageButton
              label="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
            >
              <LuChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
            <IconPageButton
              label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <LuChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
            <div
              className="flex items-center gap-1"
              aria-label="Pagination pages"
            >
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex h-9 w-9 items-center justify-center text-sm font-semibold text-foreground/40"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    aria-current={item === currentPage ? "page" : undefined}
                    onClick={() => table.setPageIndex(item - 1)}
                    variant={item === currentPage ? "default" : "outline"}
                    size="icon"
                    className="min-w-9 px-3"
                  >
                    {item}
                  </Button>
                ),
              )}
            </div>
            <IconPageButton
              label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <LuChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
            <IconPageButton
              label="Last page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(pageCount - 1)}
            >
              <LuChevronsRight className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
          </div>
        </div>
      </section>

      {createOpen ? (
        <ContractLineDialog
          mode="create"
          generatedLineNumber={generatedLineNumber}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={createLine}
        />
      ) : null}

      {selectedLine ? (
        <ContractLineDialog
          key={selectedLine.id}
          mode="update"
          line={selectedLine}
          generatedLineNumber={selectedLine.lineNumber}
          open={Boolean(selectedLine)}
          onClose={() => setSelectedLine(null)}
          onSave={updateLine}
        />
      ) : null}
    </div>
  );
}
