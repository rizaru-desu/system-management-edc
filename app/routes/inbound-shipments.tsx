import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  LuBarcode,
  LuBoxes,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuClipboardList,
  LuCircleCheck,
  LuEye,
  LuPackageSearch,
  LuSearch,
  LuShieldAlert,
  LuSlidersHorizontal,
} from "react-icons/lu";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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
import { INBOUND_SHIPMENTS, WAREHOUSES } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import type {
  InboundQcStatus,
  InboundShipment,
  InboundShipmentEvent,
  InboundShipmentStatus,
  Warehouse,
} from "~/data/mockData";

type PaginationItem = number | "ellipsis";
type StatusFilter = InboundShipmentStatus | "All";
type WarehouseFilter = string | "All";
type InboundShipmentRow = InboundShipment & {
  destinationCode: string;
  destinationName: string;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const statusFilters: StatusFilter[] = [
  "All",
  "Expected",
  "Picked Up",
  "In Transit",
  "Arrived",
  "Receiving",
  "Discrepancy",
  "Quarantine",
  "Completed",
];

export function meta() {
  return [
    { title: "Inbound Receiving | EDC.OS" },
    {
      name: "description",
      content: "Inbound receiving workspace for ASN, GRN, QC, and reconciliation.",
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

function getPinnedColumnStyles(column: Column<InboundShipmentRow>): CSSProperties {
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

function getWarehouseMap(warehouses: Warehouse[]) {
  return Object.fromEntries(
    warehouses.map((warehouse) => [warehouse.id, warehouse]),
  );
}

function formatPercent(value: number, total: number) {
  if (!total) return "0%";

  return `${Math.round((value / total) * 100)}%`;
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
        data-testid="inbound-page-size"
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

function StatusBadge({ status }: { status: InboundShipmentStatus }) {
  const variantMap: Record<
    InboundShipmentStatus,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  > = {
    Expected: "secondary",
    "Picked Up": "outline",
    "In Transit": "default",
    Arrived: "outline",
    Receiving: "default",
    Discrepancy: "warning",
    Quarantine: "destructive",
    Completed: "success",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
      {status}
    </Badge>
  );
}

function QcBadge({ status }: { status: InboundQcStatus }) {
  const variantMap: Record<
    InboundQcStatus,
    "success" | "warning" | "destructive" | "secondary"
  > = {
    Pending: "secondary",
    Passed: "success",
    Review: "warning",
    Failed: "destructive",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-20 justify-center">
      QC {status}
    </Badge>
  );
}

function DocumentBadge({
  status,
}: {
  status: InboundShipment["documents"][number]["status"];
}) {
  const variantMap: Record<
    InboundShipment["documents"][number]["status"],
    "success" | "warning" | "secondary"
  > = {
    Ready: "success",
    Captured: "success",
    Pending: "warning",
  };

  return <Badge variant={variantMap[status]}>{status}</Badge>;
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

function FlowStep({ event, isLast }: { event: InboundShipmentEvent; isLast: boolean }) {
  const toneClass = {
    Done: "bg-emerald-100 text-emerald-700",
    Active: "bg-primary text-primary-foreground",
    Pending: "bg-muted text-foreground/55",
    Issue: "bg-rose-100 text-rose-700",
  }[event.status];

  return (
    <div className="relative flex gap-3">
      {!isLast ? (
        <span className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-border" />
      ) : null}
      <span
        className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${toneClass}`}
      >
        {event.status === "Done" ? (
          <LuCircleCheck className="h-3.5 w-3.5" strokeWidth={2} />
        ) : event.status === "Issue" ? (
          <LuShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0 pb-4">
        <p className="font-semibold text-foreground">{event.label}</p>
        <p className="mt-1 text-xs leading-5 text-foreground/55">
          {[event.timestamp, event.owner].filter(Boolean).join(" - ") || "Waiting"}
        </p>
      </div>
    </div>
  );
}

function DetailPanel({
  shipment,
  warehouseName,
}: {
  shipment: InboundShipmentRow;
  warehouseName: string;
}) {
  const receivedProgress = formatPercent(
    shipment.receivedQty,
    shipment.expectedQty,
  );
  const serialProgress = formatPercent(
    shipment.serialScanned,
    shipment.expectedQty,
  );

  return (
    <section
      className="rounded-xl border border-border bg-white"
      data-testid="inbound-detail-panel"
    >
      <div className="border-b border-border p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Shipment Detail
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-foreground">
              {shipment.asnNumber}
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              {shipment.clientName} to {warehouseName}
            </p>
          </div>
          <StatusBadge status={shipment.status} />
        </div>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                ASN Qty
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {shipment.expectedQty}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                Received
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {shipment.receivedQty}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                Discrepancy
              </p>
              <p className="mt-1 text-xl font-bold text-amber-700">
                {shipment.discrepancyQty}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                Quarantine
              </p>
              <p className="mt-1 text-xl font-bold text-rose-700">
                {shipment.quarantineQty}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Receiving / GRN
                  </h3>
                  <p className="text-xs text-foreground/55">
                    {shipment.grnNumber ?? "GRN pending"}
                  </p>
                </div>
                <QcBadge status={shipment.qcStatus} />
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground/60">
                    <span>ASN vs actual received</span>
                    <span>{receivedProgress}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: receivedProgress,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground/60">
                    <span>Serial number scan</span>
                    <span>{serialProgress}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: serialProgress,
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs leading-5 text-foreground/60">
                  Stock disposition:{" "}
                  <span className="font-semibold text-foreground">
                    {shipment.stockDisposition}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground">
                Pickup & Arrival
              </h3>
              <dl className="mt-3 grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-foreground/45">
                    Origin
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {shipment.origin}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-foreground/45">
                    Pickup Team
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {shipment.pickupTeam}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-foreground/45">
                      Pickup
                    </dt>
                    <dd className="mt-1 text-foreground/65">
                      {shipment.pickupAt ?? "Scheduled"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-foreground/45">
                      Arrival
                    </dt>
                    <dd className="mt-1 text-foreground/65">
                      {shipment.arrivedAt ?? shipment.expectedAt}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-background px-4 py-3">
              <h3 className="font-semibold text-foreground">ASN Line Match</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-background">
                    <TableHead>Item</TableHead>
                    <TableHead>ASN</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead>Serial Scan</TableHead>
                    <TableHead>Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipment.lines.map((line) => (
                    <TableRow key={line.sku}>
                      <TableCell>
                        <p className="font-semibold text-foreground">
                          {line.itemName}
                        </p>
                        <p className="mt-1 text-xs text-accent">{line.sku}</p>
                      </TableCell>
                      <TableCell>{line.expectedQty}</TableCell>
                      <TableCell>{line.receivedQty}</TableCell>
                      <TableCell>{line.acceptedQty}</TableCell>
                      <TableCell>
                        {line.serialScanned}/{line.serialTotal}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            line.discrepancyQty
                              ? "font-semibold text-amber-700"
                              : "text-foreground/55"
                          }
                        >
                          {line.discrepancyQty}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground">Flow Timeline</h3>
            <div className="mt-4">
              {shipment.timeline.map((event, index) => (
                <FlowStep
                  key={`${event.label}-${index}`}
                  event={event}
                  isLast={index === shipment.timeline.length - 1}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground">Documents</h3>
            <div className="mt-3 space-y-3">
              {shipment.documents.map((document) => (
                <div
                  key={`${document.type}-${document.ref}`}
                  className="flex items-start justify-between gap-3 rounded-lg bg-background p-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {document.type}
                    </p>
                    <p className="mt-1 truncate text-xs text-foreground/55">
                      {document.ref}
                    </p>
                    {document.capturedAt ? (
                      <p className="mt-1 text-xs text-foreground/45">
                        {document.capturedAt}
                      </p>
                    ) : null}
                  </div>
                  <DocumentBadge status={document.status} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function InboundShipments() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [warehouseFilter, setWarehouseFilter] = useState<WarehouseFilter>("All");
  const [selectedShipmentId, setSelectedShipmentId] = useState(
    INBOUND_SHIPMENTS[0]?.id ?? "",
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });

  const warehouseById = useMemo(() => getWarehouseMap(WAREHOUSES), []);
  const shipments = useMemo<InboundShipmentRow[]>(
    () =>
      INBOUND_SHIPMENTS.map((shipment) => {
        const warehouse = warehouseById[shipment.destinationWarehouseId];

        return {
          ...shipment,
          destinationCode: warehouse?.code ?? "Unassigned",
          destinationName: warehouse?.name ?? "Unassigned warehouse",
        };
      }),
    [warehouseById],
  );

  const filteredShipments = useMemo(
    () =>
      shipments.filter((shipment) => {
        const matchesStatus =
          statusFilter === "All" || shipment.status === statusFilter;
        const matchesWarehouse =
          warehouseFilter === "All" ||
          shipment.destinationWarehouseId === warehouseFilter;

        return matchesStatus && matchesWarehouse;
      }),
    [shipments, statusFilter, warehouseFilter],
  );

  const selectedShipment =
    filteredShipments.find((shipment) => shipment.id === selectedShipmentId) ??
    filteredShipments[0] ??
    null;

  const columns = useMemo<ColumnDef<InboundShipmentRow>[]>(
    () => [
      {
        id: "shipment",
        accessorFn: (row) => `${row.asnNumber} ${row.clientName} ${row.origin}`,
        header: "Shipment",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.asnNumber}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-accent">
              {row.original.clientName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.origin}
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
        id: "destination",
        accessorFn: (row) => `${row.destinationCode} ${row.destinationName}`,
        header: "Destination",
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.destinationName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.destinationCode}
            </p>
          </div>
        ),
      },
      {
        id: "schedule",
        accessorFn: (row) =>
          `${row.expectedAt} ${row.pickupAt ?? ""} ${row.arrivedAt ?? ""}`,
        header: "Schedule",
        size: 210,
        cell: ({ row }) => (
          <div className="text-xs font-medium leading-5 text-foreground/65">
            <p>Expected: {row.original.expectedAt}</p>
            <p>Pickup: {row.original.pickupAt ?? "Pending"}</p>
            <p>Arrival: {row.original.arrivedAt ?? "Pending"}</p>
          </div>
        ),
      },
      {
        id: "qty",
        accessorFn: (row) => `${row.expectedQty} ${row.receivedQty}`,
        header: "Qty",
        size: 140,
        cell: ({ row }) => (
          <div className="text-xs font-semibold text-foreground/65">
            <p>ASN: {row.original.expectedQty}</p>
            <p className="mt-1">Actual: {row.original.receivedQty}</p>
          </div>
        ),
      },
      {
        id: "serialScan",
        accessorFn: (row) => `${row.serialScanned} ${row.expectedQty}`,
        header: "Serial Scan",
        size: 150,
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-foreground">
              {row.original.serialScanned}/{row.original.expectedQty}
            </p>
            <p className="mt-1 text-xs text-foreground/55">
              {formatPercent(row.original.serialScanned, row.original.expectedQty)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "qcStatus",
        id: "qcStatus",
        header: "QC",
        size: 120,
        cell: ({ row }) => <QcBadge status={row.original.qcStatus} />,
      },
      {
        id: "exceptions",
        accessorFn: (row) => `${row.discrepancyQty} ${row.quarantineQty}`,
        header: "Exceptions",
        size: 150,
        cell: ({ row }) => (
          <div className="text-xs font-semibold text-foreground/65">
            <p>Disc: {row.original.discrepancyQty}</p>
            <p className="mt-1">Qrt: {row.original.quarantineQty}</p>
          </div>
        ),
      },
      {
        accessorKey: "supervisor",
        id: "supervisor",
        header: "Supervisor",
        size: 190,
        cell: (info) => (
          <span className="font-medium text-foreground">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        size: 120,
        enableGlobalFilter: false,
        enablePinning: true,
        cell: ({ row }) => (
          <Button
            onClick={() => setSelectedShipmentId(row.original.id)}
            size="sm"
            variant={
              row.original.id === selectedShipment?.id ? "default" : "outline"
            }
            aria-label={`View ${row.original.asnNumber}`}
            data-testid={`view-inbound-${row.original.id}`}
          >
            <LuEye className="h-3.5 w-3.5" strokeWidth={1.75} />
            View
          </Button>
        ),
      },
    ],
    [selectedShipment?.id],
  );

  const table = useReactTable({
    data: filteredShipments,
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
  const openShipments = shipments.filter(
    (shipment) => shipment.status !== "Completed",
  ).length;
  const inboundUnits = shipments.reduce(
    (total, shipment) => total + shipment.expectedQty,
    0,
  );
  const receivingUnits = shipments
    .filter((shipment) => shipment.status === "Receiving")
    .reduce((total, shipment) => total + shipment.receivedQty, 0);
  const exceptionShipments = shipments.filter(
    (shipment) =>
      shipment.status === "Discrepancy" || shipment.status === "Quarantine",
  ).length;

  return (
    <div
      className="animate-fade-up space-y-6"
      data-testid="inbound-shipments-page"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Asset Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Inbound Receiving
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Track ASN intake, pickup scan, arrival, receiving, QC, discrepancy,
            quarantine, and final reconciliation in one mock workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile
            label="Open"
            value={openShipments}
            icon={LuPackageSearch}
            tone={openShipments ? "warning" : "good"}
          />
          <MetricTile
            label="ASN Units"
            value={inboundUnits}
            icon={LuBoxes}
          />
          <MetricTile
            label="Receiving"
            value={receivingUnits}
            icon={LuBarcode}
            tone={receivingUnits ? "default" : "warning"}
          />
          <MetricTile
            label="Exceptions"
            value={exceptionShipments}
            icon={LuShieldAlert}
            tone={exceptionShipments ? "danger" : "good"}
          />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuClipboardList className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Receiving Queue
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search inbound shipments</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search ASN, client, warehouse..."
                className="pl-9"
                data-testid="inbound-search-input"
              />
            </label>

            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                table.setPageIndex(0);
              }}
              className="sm:w-40"
              data-testid="inbound-status-filter"
            >
              {statusFilters.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All status" : status}
                </option>
              ))}
            </Select>

            <Select
              value={warehouseFilter}
              onChange={(event) => {
                setWarehouseFilter(event.target.value as WarehouseFilter);
                table.setPageIndex(0);
              }}
              className="sm:w-56"
              data-testid="inbound-warehouse-filter"
            >
              <option value="All">All warehouses</option>
              {WAREHOUSES.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </Select>

            <RowsPerPageDropdown
              value={table.getState().pagination.pageSize}
              onChange={(pageSize) => table.setPageSize(pageSize)}
            />
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
                  <TableRow
                    key={row.id}
                    className={
                      row.original.id === selectedShipment?.id
                        ? "bg-muted/30"
                        : undefined
                    }
                  >
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
                    No inbound shipments match your filters.
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

      {selectedShipment ? (
        <DetailPanel
          shipment={selectedShipment}
          warehouseName={selectedShipment.destinationName}
        />
      ) : null}
    </div>
  );
}
