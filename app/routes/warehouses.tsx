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
  LuBox,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuClipboardCheck,
  LuPackageCheck,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSlidersHorizontal,
  LuTruck,
  LuWarehouse,
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
import { WAREHOUSES } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type {
  Warehouse,
  WarehouseStatus,
  WarehouseType,
} from "~/data/mockData";

type PaginationItem = number | "ellipsis";
type WarehouseFormValues = {
  code: string;
  name: string;
  status: WarehouseStatus;
  type: WarehouseType;
  region: string;
  city: string;
  address: string;
  managerName: string;
  contactPhone: string;
  capacityTotal: string;
  capacityUsed: string;
  serviceArea: string;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const warehouseStatuses: WarehouseStatus[] = [
  "Active",
  "Maintenance",
  "Full",
  "Inactive",
];
const warehouseTypes: WarehouseType[] = [
  "Central",
  "Regional",
  "Spare Pool",
  "Repair Hub",
];

export function meta() {
  return [
    { title: "Warehouse Stock | EDC.OS" },
    {
      name: "description",
      content: "Warehouse master data and inventory capacity workspace.",
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

function getPinnedColumnStyles(column: Column<Warehouse>): CSSProperties {
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
        data-testid="warehouse-page-size"
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

function StatusBadge({ status }: { status: WarehouseStatus }) {
  const variantMap: Record<
    WarehouseStatus,
    "success" | "warning" | "destructive" | "secondary"
  > = {
    Active: "success",
    Maintenance: "warning",
    Full: "destructive",
    Inactive: "secondary",
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
  icon: typeof LuWarehouse;
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

function capacityPercent(warehouse: Warehouse) {
  if (!warehouse.capacityTotal) return 0;
  return Math.round((warehouse.capacityUsed / warehouse.capacityTotal) * 100);
}

function getWarehouseId(code: string, name: string, existingIds: Set<string>) {
  const slug = (code || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const baseId = `wh-${slug || Date.now()}`;

  if (!existingIds.has(baseId)) return baseId;

  let index = existingIds.size + 1;
  let nextId = `${baseId}-${index}`;

  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
}

function getWarehouseFormValues(warehouse?: Warehouse): WarehouseFormValues {
  return {
    code: warehouse?.code ?? "",
    name: warehouse?.name ?? "",
    status: warehouse?.status ?? "Active",
    type: warehouse?.type ?? "Regional",
    region: warehouse?.region ?? "",
    city: warehouse?.city ?? "",
    address: warehouse?.address ?? "",
    managerName: warehouse?.managerName ?? "",
    contactPhone: warehouse?.contactPhone ?? "",
    capacityTotal: String(warehouse?.capacityTotal ?? 1000),
    capacityUsed: String(warehouse?.capacityUsed ?? 0),
    serviceArea: warehouse?.serviceArea ?? "",
  };
}

function WarehouseDialog({
  mode,
  warehouse,
  open,
  onClose,
  onSave,
}: {
  mode: "create" | "update";
  warehouse?: Warehouse;
  open: boolean;
  onClose: () => void;
  onSave: (warehouse: Warehouse) => void;
}) {
  const form = useForm({
    defaultValues: getWarehouseFormValues(warehouse),
    onSubmit: ({ value }) => {
      const capacityTotal = Math.max(Number(value.capacityTotal) || 0, 0);
      const capacityUsed = Math.min(
        Math.max(Number(value.capacityUsed) || 0, 0),
        capacityTotal,
      );

      onSave({
        id: warehouse?.id ?? "",
        code: value.code.trim(),
        name: value.name.trim(),
        status: value.status,
        type: value.type,
        region: value.region.trim(),
        city: value.city.trim(),
        address: value.address.trim(),
        managerName: value.managerName.trim(),
        contactPhone: value.contactPhone.trim(),
        capacityTotal,
        capacityUsed,
        terminalStock: warehouse?.terminalStock ?? 0,
        sparePartStock: warehouse?.sparePartStock ?? 0,
        inboundPending: warehouse?.inboundPending ?? 0,
        outboundPending: warehouse?.outboundPending ?? 0,
        lastAuditAt: warehouse?.lastAuditAt ?? "2026-04-29",
        serviceArea: value.serviceArea.trim(),
      });
    },
  });

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
              Warehouse Profile
            </p>
            <DialogTitle>
              {mode === "create" ? "Create Warehouse" : "Update Warehouse"}
            </DialogTitle>
            <DialogDescription>
              Manage location, owner, capacity, and service coverage for this
              warehouse.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Code
                </span>
                <form.Field name="code">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="WH-JKT-09"
                      data-testid="warehouse-code-input"
                    />
                  )}
                </form.Field>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Warehouse name
                </span>
                <form.Field name="name">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Jakarta North Stockroom"
                      data-testid="warehouse-name-input"
                    />
                  )}
                </form.Field>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Status
                </span>
                <form.Field name="status">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value as WarehouseStatus)
                      }
                      data-testid="warehouse-status-select"
                    >
                      {warehouseStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  )}
                </form.Field>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Type
                </span>
                <form.Field name="type">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value as WarehouseType)
                      }
                      data-testid="warehouse-type-select"
                    >
                      {warehouseTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  )}
                </form.Field>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Region
                </span>
                <form.Field name="region">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Jabodetabek North"
                      data-testid="warehouse-region-input"
                    />
                  )}
                </form.Field>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  City
                </span>
                <form.Field name="city">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Jakarta"
                      data-testid="warehouse-city-input"
                    />
                  )}
                </form.Field>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-semibold text-foreground/65">
                Address
              </span>
              <form.Field name="address">
                {(field) => (
                  <Input
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Street address"
                    data-testid="warehouse-address-input"
                  />
                )}
              </form.Field>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Manager
                </span>
                <form.Field name="managerName">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Manager name"
                      data-testid="warehouse-manager-input"
                    />
                  )}
                </form.Field>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Contact phone
                </span>
                <form.Field name="contactPhone">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="+62 ..."
                      data-testid="warehouse-phone-input"
                    />
                  )}
                </form.Field>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Capacity total
                </span>
                <form.Field name="capacityTotal">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      inputMode="numeric"
                      data-testid="warehouse-capacity-total-input"
                    />
                  )}
                </form.Field>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Capacity used
                </span>
                <form.Field name="capacityUsed">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      inputMode="numeric"
                      data-testid="warehouse-capacity-used-input"
                    />
                  )}
                </form.Field>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-semibold text-foreground/65">
                Service area
              </span>
              <form.Field name="serviceArea">
                {(field) => (
                  <Input
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Jakarta, Bogor, Depok"
                    data-testid="warehouse-service-area-input"
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
                  disabled={!values.code.trim() || !values.name.trim()}
                  data-testid="save-warehouse-button"
                >
                  {mode === "create" ? "Create Warehouse" : "Save Changes"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WarehouseStock() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(WAREHOUSES);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<Warehouse | null>(null);

  const columns = useMemo<ColumnDef<Warehouse>[]>(
    () => [
      {
        id: "warehouse",
        accessorFn: (row) => `${row.code} ${row.name}`,
        header: "Warehouse",
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.name}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-accent">
              {row.original.code}
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
        accessorKey: "type",
        id: "type",
        header: "Type",
        size: 150,
      },
      {
        id: "location",
        accessorFn: (row) => `${row.region} ${row.city} ${row.address}`,
        header: "Region / City",
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.region}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.city} - {row.original.address}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "managerName",
        id: "managerName",
        header: "Manager",
        size: 210,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {row.original.managerName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.contactPhone}
            </p>
          </div>
        ),
      },
      {
        id: "capacity",
        accessorFn: (row) =>
          `${row.capacityUsed} ${row.capacityTotal} ${capacityPercent(row)}%`,
        header: "Capacity",
        size: 180,
        cell: ({ row }) => {
          const percent = capacityPercent(row.original);

          return (
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{percent}% used</p>
              <p className="mt-1 text-xs text-foreground/55">
                {row.original.capacityUsed.toLocaleString()} /{" "}
                {row.original.capacityTotal.toLocaleString()}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "terminalStock",
        id: "terminalStock",
        header: "Terminal Stock",
        size: 150,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<number>().toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "sparePartStock",
        id: "sparePartStock",
        header: "Spare Parts",
        size: 140,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<number>().toLocaleString()}
          </span>
        ),
      },
      {
        id: "pendingFlow",
        accessorFn: (row) => `${row.inboundPending} ${row.outboundPending}`,
        header: "Pending Flow",
        size: 160,
        cell: ({ row }) => (
          <div className="text-xs font-semibold text-foreground/65">
            <p>In: {row.original.inboundPending}</p>
            <p className="mt-1">Out: {row.original.outboundPending}</p>
          </div>
        ),
      },
      {
        accessorKey: "lastAuditAt",
        id: "lastAuditAt",
        header: "Last Audit",
        size: 130,
      },
      {
        accessorKey: "serviceArea",
        id: "serviceArea",
        header: "Service Area",
        size: 280,
        cell: (info) => (
          <span className="line-clamp-2 text-xs leading-5 text-foreground/60">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        size: 140,
        enableGlobalFilter: false,
        enablePinning: true,
        cell: ({ row }) => (
          <Button
            onClick={() => setSelectedWarehouse(row.original)}
            size="sm"
            aria-label={`Update ${row.original.name}`}
            data-testid={`update-warehouse-${row.original.id}`}
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
    data: warehouses,
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
  const totalCapacity = warehouses.reduce(
    (total, warehouse) => total + warehouse.capacityTotal,
    0,
  );
  const usedCapacity = warehouses.reduce(
    (total, warehouse) => total + warehouse.capacityUsed,
    0,
  );
  const usedCapacityPercent = totalCapacity
    ? Math.round((usedCapacity / totalCapacity) * 100)
    : 0;
  const pendingInbound = warehouses.reduce(
    (total, warehouse) => total + warehouse.inboundPending,
    0,
  );
  const pendingOutbound = warehouses.reduce(
    (total, warehouse) => total + warehouse.outboundPending,
    0,
  );

  const createWarehouse = (warehouse: Warehouse) => {
    const id = getWarehouseId(
      warehouse.code,
      warehouse.name,
      new Set(warehouses.map((item) => item.id)),
    );

    setWarehouses((current) => [...current, { ...warehouse, id }]);
    setCreateOpen(false);
  };

  const updateWarehouse = (warehouse: Warehouse) => {
    if (!selectedWarehouse) return;

    setWarehouses((current) =>
      current.map((item) =>
        item.id === selectedWarehouse.id
          ? {
              ...item,
              ...warehouse,
              id: selectedWarehouse.id,
              terminalStock: item.terminalStock,
              sparePartStock: item.sparePartStock,
              inboundPending: item.inboundPending,
              outboundPending: item.outboundPending,
              lastAuditAt: item.lastAuditAt,
            }
          : item,
      ),
    );
    setSelectedWarehouse(null);
  };

  return (
    <div className="animate-fade-up space-y-6" data-testid="warehouse-stock-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Inventory
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Warehouse Stock
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Manage warehouse profiles, capacity, service coverage, and stock
            readiness from one inventory workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile
            label="Warehouses"
            value={warehouses.length}
            icon={LuWarehouse}
          />
          <MetricTile
            label="Active"
            value={warehouses.filter((item) => item.status === "Active").length}
            icon={LuPackageCheck}
            tone="good"
          />
          <MetricTile
            label="Capacity Used"
            value={`${usedCapacityPercent}%`}
            icon={LuBox}
            tone={usedCapacityPercent >= 90 ? "danger" : "default"}
          />
          <MetricTile
            label="Pending"
            value={`${pendingInbound}/${pendingOutbound}`}
            icon={LuTruck}
            tone={pendingInbound + pendingOutbound ? "warning" : "good"}
          />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuClipboardCheck className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Warehouse List
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search warehouses</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search warehouse, region, manager..."
                className="pl-9"
                data-testid="warehouse-search-input"
              />
            </label>

            <RowsPerPageDropdown
              value={table.getState().pagination.pageSize}
              onChange={(pageSize) => table.setPageSize(pageSize)}
            />
            <Button
              onClick={() => setCreateOpen(true)}
              data-testid="create-warehouse-button"
            >
              <LuPlus className="h-4 w-4" strokeWidth={1.75} />
              Create Warehouse
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
                    No warehouses match your search.
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
        <WarehouseDialog
          mode="create"
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={createWarehouse}
        />
      ) : null}

      {selectedWarehouse ? (
        <WarehouseDialog
          key={selectedWarehouse.id}
          mode="update"
          warehouse={selectedWarehouse}
          open={Boolean(selectedWarehouse)}
          onClose={() => setSelectedWarehouse(null)}
          onSave={updateWarehouse}
        />
      ) : null}
    </div>
  );
}
