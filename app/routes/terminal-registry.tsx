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
  LuCreditCard,
  LuHardDrive,
  LuPencil,
  LuPlus,
  LuSearch,
  LuShieldAlert,
  LuSlidersHorizontal,
  LuStore,
  LuUserRound,
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
import { MERCHANTS, TERMINALS } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import type { Merchant, Terminal } from "~/data/mockData";

type PaginationItem = number | "ellipsis";
type TerminalStatus = Terminal["status"];
type TerminalRecord = Terminal & {
  csi: string;
};
type TerminalRow = TerminalRecord & {
  merchantName: string;
  merchantMid: string;
  merchantCity: string;
  picName: string;
  picPhone: string;
};
type TerminalFormValues = {
  tid: string;
  csi: string;
  merchantId: string;
  status: TerminalStatus;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const terminalStatuses: TerminalStatus[] = ["Active", "Problem", "Maintenance"];

export function meta() {
  return [
    { title: "Terminal Registry | EDC.OS" },
    {
      name: "description",
      content: "Terminal master data registry with merchant ownership mapping.",
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

function getPinnedColumnStyles(column: Column<TerminalRow>): CSSProperties {
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

function normalizeUniqueValue(value: string) {
  return value.trim().toUpperCase();
}

function getMerchantMap(merchants: Merchant[]) {
  return Object.fromEntries(merchants.map((merchant) => [merchant.id, merchant]));
}

function getInitialTerminals(): TerminalRecord[] {
  return TERMINALS.map((terminal) => ({
    ...terminal,
    csi: `CSI-${terminal.tid.replace(/^TID-/, "")}`,
  }));
}

function getTerminalId(tid: string, existingIds: Set<string>) {
  const slug = tid
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const baseId = `term-${slug || Date.now()}`;

  if (!existingIds.has(baseId)) return baseId;

  let index = existingIds.size + 1;
  let nextId = `${baseId}-${index}`;

  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
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
        data-testid="terminal-page-size"
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

function StatusBadge({ status }: { status: TerminalStatus }) {
  const variantMap: Record<
    TerminalStatus,
    "success" | "warning" | "destructive"
  > = {
    Active: "success",
    Problem: "destructive",
    Maintenance: "warning",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
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
  tone?: "default" | "good" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
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

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: IconType;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background/45 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-accent">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        {title}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function TerminalDialog({
  mode,
  terminal,
  terminals,
  merchants,
  open,
  onClose,
  onSave,
}: {
  mode: "create" | "update";
  terminal?: TerminalRow;
  terminals: TerminalRecord[];
  merchants: Merchant[];
  open: boolean;
  onClose: () => void;
  onSave: (terminal: TerminalFormValues) => void;
}) {
  const [merchantSearch, setMerchantSearch] = useState("");
  const merchantById = useMemo(() => getMerchantMap(merchants), [merchants]);
  const defaultMerchantId = terminal?.merchantId ?? merchants[0]?.id ?? "";
  const selectedMerchant =
    merchantById[terminal?.merchantId ?? defaultMerchantId] ??
    merchants[0] ??
    null;
  const filteredMerchants = useMemo(() => {
    const keyword = merchantSearch.trim().toLowerCase();

    if (!keyword) return merchants;

    return merchants.filter((merchant) =>
      [
        merchant.mid,
        merchant.name,
        merchant.brandName,
        merchant.city,
        merchant.picName,
        merchant.picPhone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [merchantSearch, merchants]);

  const form = useForm({
    defaultValues: {
      tid: terminal?.tid ?? "",
      csi: terminal?.csi ?? "",
      merchantId: defaultMerchantId,
      status: terminal?.status ?? "Active",
    } satisfies TerminalFormValues,
    onSubmit: ({ value }) => onSave(value),
  });

  const getDuplicateMessage = (values: TerminalFormValues) => {
    const tid = normalizeUniqueValue(values.tid);
    const csi = normalizeUniqueValue(values.csi);
    const duplicatedTid = terminals.some(
      (item) =>
        item.id !== terminal?.id && normalizeUniqueValue(item.tid) === tid,
    );
    const duplicatedCsi = terminals.some(
      (item) =>
        item.id !== terminal?.id && normalizeUniqueValue(item.csi) === csi,
    );

    if (duplicatedTid) return "TID sudah terdaftar.";
    if (duplicatedCsi) return "CSI sudah terdaftar.";

    return "";
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="max-h-[min(44rem,calc(100vh-2rem))] max-w-3xl">
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
              Terminal Registry
            </p>
            <DialogTitle>
              {mode === "create" ? "New Terminal" : "Update Terminal"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Create terminal identity and map it to merchant contact ownership."
                : "Only TID, CSI, and status can be changed from this action."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 overflow-y-auto p-5">
            <FormSection title="Terminal Identity" icon={LuCreditCard}>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    TID
                  </span>
                  <form.Field name="tid">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="TID-8001"
                        data-testid="terminal-tid-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    CSI
                  </span>
                  <form.Field name="csi">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="CSI-8001"
                        data-testid="terminal-csi-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Status
                  </span>
                  <form.Field name="status">
                    {(field) => (
                      <Select
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value as TerminalStatus)
                        }
                        data-testid="terminal-status-select"
                      >
                        {terminalStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    )}
                  </form.Field>
                </label>
              </div>
            </FormSection>

            {mode === "create" ? (
              <FormSection title="Merchant Mapping" icon={LuStore}>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-foreground/65">
                      Search merchant
                    </span>
                    <Input
                      value={merchantSearch}
                      onChange={(event) => setMerchantSearch(event.target.value)}
                      placeholder="Search merchant, MID, city, PIC..."
                      data-testid="terminal-merchant-search-input"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-foreground/65">
                      Merchant
                    </span>
                    <form.Field name="merchantId">
                      {(field) => {
                        const selectedOption = merchantById[field.state.value];
                        const merchantOptions =
                          selectedOption &&
                          !filteredMerchants.some(
                            (merchant) => merchant.id === selectedOption.id,
                          )
                            ? [selectedOption, ...filteredMerchants]
                            : filteredMerchants;

                        return (
                          <Select
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            data-testid="terminal-merchant-select"
                          >
                            {merchantOptions.map((merchant) => (
                              <option key={merchant.id} value={merchant.id}>
                                {merchant.mid} - {merchant.name}
                              </option>
                            ))}
                          </Select>
                        );
                      }}
                    </form.Field>
                  </label>
                </div>

                <form.Subscribe selector={(state) => state.values.merchantId}>
                  {(merchantId) => {
                    const merchant = merchantById[merchantId] ?? selectedMerchant;

                    return (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-xs font-semibold text-foreground/65">
                            PIC
                          </span>
                          <Input
                            value={merchant?.picName ?? ""}
                            readOnly
                            className="bg-white font-semibold"
                            data-testid="terminal-pic-input"
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-xs font-semibold text-foreground/65">
                            Phone contact
                          </span>
                          <Input
                            value={merchant?.picPhone ?? ""}
                            readOnly
                            className="bg-white font-semibold"
                            data-testid="terminal-phone-input"
                          />
                        </label>
                      </div>
                    );
                  }}
                </form.Subscribe>
              </FormSection>
            ) : (
              <FormSection title="Merchant Contact" icon={LuUserRound}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground/55">
                      Merchant
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {terminal?.merchantName}
                    </p>
                    <p className="mt-1 text-xs text-foreground/55">
                      {terminal?.merchantMid}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground/55">
                      PIC
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {terminal?.picName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground/55">
                      Phone contact
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {terminal?.picPhone}
                    </p>
                  </div>
                </div>
              </FormSection>
            )}

            <form.Subscribe selector={(state) => state.values}>
              {(values) => {
                const duplicateMessage = getDuplicateMessage(values);

                return duplicateMessage ? (
                  <div
                    className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                    data-testid="terminal-duplicate-warning"
                  >
                    {duplicateMessage}
                  </div>
                ) : null;
              }}
            </form.Subscribe>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => state.values}>
              {(values) => {
                const duplicateMessage = getDuplicateMessage(values);

                return (
                  <Button
                    type="submit"
                    disabled={
                      !values.tid.trim() ||
                      !values.csi.trim() ||
                      !values.merchantId ||
                      Boolean(duplicateMessage)
                    }
                    data-testid="save-terminal-button"
                  >
                    {mode === "create" ? "Create Terminal" : "Save Changes"}
                  </Button>
                );
              }}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TerminalRegistry() {
  const [terminals, setTerminals] = useState<TerminalRecord[]>(() =>
    getInitialTerminals(),
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalRow | null>(
    null,
  );

  const merchantById = useMemo(() => getMerchantMap(MERCHANTS), []);
  const tableData = useMemo<TerminalRow[]>(
    () =>
      terminals.map((terminal) => {
        const merchant = merchantById[terminal.merchantId];

        return {
          ...terminal,
          merchantName: merchant?.name ?? "Unassigned merchant",
          merchantMid: merchant?.mid ?? "-",
          merchantCity: merchant?.city ?? "-",
          picName: merchant?.picName ?? "-",
          picPhone: merchant?.picPhone ?? "-",
        };
      }),
    [merchantById, terminals],
  );

  const columns = useMemo<ColumnDef<TerminalRow>[]>(
    () => [
      {
        id: "terminal",
        accessorFn: (row) => `${row.tid} ${row.csi}`,
        header: "TID / CSI",
        size: 220,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.tid}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-accent">
              {row.original.csi}
            </p>
          </div>
        ),
      },
      {
        id: "merchant",
        accessorFn: (row) =>
          `${row.merchantName} ${row.merchantMid} ${row.merchantCity}`,
        header: "Merchant",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.merchantName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.merchantMid} - {row.original.merchantCity}
            </p>
          </div>
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
        accessorKey: "model",
        id: "model",
        header: "Model",
        size: 180,
      },
      {
        id: "pic",
        accessorFn: (row) => `${row.picName} ${row.picPhone}`,
        header: "PIC / Phone",
        size: 240,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.picName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.picPhone}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "lastSignal",
        id: "lastSignal",
        header: "Last Signal",
        size: 150,
      },
      {
        id: "actions",
        header: "Action",
        size: 140,
        enableGlobalFilter: false,
        enablePinning: true,
        cell: ({ row }) => (
          <Button
            onClick={() => setSelectedTerminal(row.original)}
            size="sm"
            aria-label={`Update ${row.original.tid}`}
            data-testid={`update-terminal-${row.original.id}`}
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
  const activeTerminals = terminals.filter(
    (terminal) => terminal.status === "Active",
  ).length;
  const problemTerminals = terminals.filter(
    (terminal) => terminal.status === "Problem",
  ).length;
  const mappedMerchants = new Set(terminals.map((terminal) => terminal.merchantId))
    .size;

  const createTerminal = (values: TerminalFormValues) => {
    const merchant = merchantById[values.merchantId] ?? MERCHANTS[0];
    const id = getTerminalId(
      values.tid,
      new Set(terminals.map((terminal) => terminal.id)),
    );

    setTerminals((current) => [
      ...current,
      {
        id,
        tid: values.tid.trim(),
        csi: values.csi.trim(),
        merchantId: values.merchantId,
        servicePointId: merchant?.servicePointId ?? "",
        model: "Unassigned EDC",
        status: values.status,
        lastSignal: "Pending activation",
      },
    ]);
    setCreateOpen(false);
  };

  const updateTerminal = (values: TerminalFormValues) => {
    if (!selectedTerminal) return;

    setTerminals((current) =>
      current.map((terminal) =>
        terminal.id === selectedTerminal.id
          ? {
              ...terminal,
              tid: values.tid.trim(),
              csi: values.csi.trim(),
              status: values.status,
            }
          : terminal,
      ),
    );
    setSelectedTerminal(null);
  };

  return (
    <div className="animate-fade-up space-y-6" data-testid="terminal-registry-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Terminal Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Terminal Registry
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Manage terminal identity, CSI mapping, merchant ownership, and
            operational status from one registry.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile label="Terminals" value={terminals.length} icon={LuHardDrive} />
          <MetricTile
            label="Active"
            value={activeTerminals}
            icon={LuBadgeCheck}
            tone="good"
          />
          <MetricTile
            label="Problem"
            value={problemTerminals}
            icon={LuShieldAlert}
            tone={problemTerminals ? "danger" : "good"}
          />
          <MetricTile label="Merchants" value={mappedMerchants} icon={LuStore} />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuCircleDot className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Terminal List
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search terminals</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search TID, CSI, merchant, PIC..."
                className="pl-9"
                data-testid="terminal-search-input"
              />
            </label>

            <RowsPerPageDropdown
              value={table.getState().pagination.pageSize}
              onChange={(pageSize) => table.setPageSize(pageSize)}
            />
            <Button
              onClick={() => setCreateOpen(true)}
              data-testid="create-terminal-button"
            >
              <LuPlus className="h-4 w-4" strokeWidth={1.75} />
              New Terminal
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
                    No terminals match your search.
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
        <TerminalDialog
          mode="create"
          terminals={terminals}
          merchants={MERCHANTS}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={createTerminal}
        />
      ) : null}

      {selectedTerminal ? (
        <TerminalDialog
          key={selectedTerminal.id}
          mode="update"
          terminal={selectedTerminal}
          terminals={terminals}
          merchants={MERCHANTS}
          open={Boolean(selectedTerminal)}
          onClose={() => setSelectedTerminal(null)}
          onSave={updateTerminal}
        />
      ) : null}
    </div>
  );
}
