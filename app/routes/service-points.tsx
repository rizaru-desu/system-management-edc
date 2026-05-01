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
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuClipboardList,
  LuMapPin,
  LuPackage,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSlidersHorizontal,
  LuUsers,
  LuWrench,
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
import { SERVICE_POINTS, WAREHOUSES } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import type { ServicePoint, Warehouse } from "~/data/mockData";

type PaginationItem = number | "ellipsis";
type ServicePointStatus = ServicePoint["status"];
type ServicePointRow = ServicePoint & {
  warehouseCode: string;
  warehouseName: string;
};
type ServicePointFormValues = {
  code: string;
  name: string;
  status: ServicePointStatus;
  region: string;
  city: string;
  address: string;
  warehouseId: string;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const servicePointStatuses: ServicePointStatus[] = [
  "Online",
  "Degraded",
  "Offline",
];

export function meta() {
  return [
    { title: "Service Point Stock | EDC.OS" },
    {
      name: "description",
      content:
        "Service point stock, buffer, and coverage workspace.",
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

function getPinnedColumnStyles(column: Column<ServicePointRow>): CSSProperties {
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
        data-testid="service-point-page-size"
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

function StatusBadge({ status }: { status: ServicePointStatus }) {
  const variantMap: Record<
    ServicePointStatus,
    "success" | "warning" | "destructive"
  > = {
    Online: "success",
    Degraded: "warning",
    Offline: "destructive",
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

function getWarehouseMap(warehouses: Warehouse[]) {
  return Object.fromEntries(
    warehouses.map((warehouse) => [warehouse.id, warehouse]),
  );
}

function getServicePointId(
  code: string,
  name: string,
  existingIds: Set<string>,
) {
  const slug = (code || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const baseId = `sp-${slug || Date.now()}`;

  if (!existingIds.has(baseId)) return baseId;

  let index = existingIds.size + 1;
  let nextId = `${baseId}-${index}`;

  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
}

function getServicePointFormValues(
  servicePoint?: ServicePoint,
): ServicePointFormValues {
  return {
    code: servicePoint?.code ?? "",
    name: servicePoint?.name ?? "",
    status: servicePoint?.status ?? "Online",
    region: servicePoint?.region ?? "",
    city: servicePoint?.city ?? "",
    address: servicePoint?.address ?? "",
    warehouseId: servicePoint?.warehouseId ?? WAREHOUSES[0]?.id ?? "",
  };
}

function ServicePointDialog({
  mode,
  servicePoint,
  open,
  onClose,
  onSave,
}: {
  mode: "create" | "update";
  servicePoint?: ServicePoint;
  open: boolean;
  onClose: () => void;
  onSave: (servicePoint: ServicePoint) => void;
}) {
  const form = useForm({
    defaultValues: getServicePointFormValues(servicePoint),
    onSubmit: ({ value }) => {
      onSave({
        id: servicePoint?.id ?? "",
        code: value.code.trim(),
        name: value.name.trim(),
        status: value.status,
        region: value.region.trim(),
        city: value.city.trim(),
        address: value.address.trim(),
        warehouseId: value.warehouseId,
        cluster: servicePoint?.cluster ?? "Unassigned",
        load: servicePoint?.load ?? 0,
        openJobs: servicePoint?.openJobs ?? 0,
        technicianCount: servicePoint?.technicianCount ?? 0,
        clusterTechnicianCount: servicePoint?.clusterTechnicianCount ?? 0,
        unmappedTechnicianCount: servicePoint?.unmappedTechnicianCount ?? 0,
        terminalBuffer: servicePoint?.terminalBuffer ?? 0,
        sparePartBuffer: servicePoint?.sparePartBuffer ?? 0,
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-h-[min(46rem,calc(100vh-2rem))] max-w-4xl">
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
              Service Point Profile
            </p>
            <DialogTitle>
              {mode === "create"
                ? "Create Service Point"
                : "Update Service Point"}
            </DialogTitle>
            <DialogDescription>
              Manage service coverage, warehouse ownership, and inventory buffer
              readiness.
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
                      placeholder="SP-JKT-08"
                      data-testid="service-point-code-input"
                    />
                  )}
                </form.Field>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Service point name
                </span>
                <form.Field name="name">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="SP Jakarta Selatan"
                      data-testid="service-point-name-input"
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
                        field.handleChange(event.target.value as ServicePointStatus)
                      }
                      data-testid="service-point-status-select"
                    >
                      {servicePointStatuses.map((status) => (
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
                  Warehouse
                </span>
                <form.Field name="warehouseId">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      data-testid="service-point-warehouse-select"
                    >
                      {WAREHOUSES.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} - {warehouse.name}
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
                      placeholder="Jabodetabek South"
                      data-testid="service-point-region-input"
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
                      data-testid="service-point-city-input"
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
                    data-testid="service-point-address-input"
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
                    !values.code.trim() ||
                    !values.name.trim() ||
                    !values.region.trim() ||
                    !values.city.trim() ||
                    !values.warehouseId
                  }
                  data-testid="save-service-point-button"
                >
                  {mode === "create" ? "Create Service Point" : "Save Changes"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryServicePoints() {
  const [servicePoints, setServicePoints] =
    useState<ServicePoint[]>(SERVICE_POINTS);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedServicePoint, setSelectedServicePoint] =
    useState<ServicePoint | null>(null);

  const warehouseById = useMemo(() => getWarehouseMap(WAREHOUSES), []);
  const tableData = useMemo<ServicePointRow[]>(
    () =>
      servicePoints.map((servicePoint) => {
        const warehouse = warehouseById[servicePoint.warehouseId];

        return {
          ...servicePoint,
          warehouseCode: warehouse?.code ?? "Unassigned",
          warehouseName: warehouse?.name ?? "Unassigned warehouse",
        };
      }),
    [servicePoints, warehouseById],
  );

  const columns = useMemo<ColumnDef<ServicePointRow>[]>(
    () => [
      {
        id: "servicePoint",
        accessorFn: (row) => `${row.code} ${row.name}`,
        header: "Service Point",
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
        id: "warehouse",
        accessorFn: (row) => `${row.warehouseCode} ${row.warehouseName}`,
        header: "Warehouse",
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.warehouseName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.warehouseCode}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "cluster",
        id: "cluster",
        header: "Cluster",
        size: 220,
        cell: (info) => (
          <span className="line-clamp-2 text-xs font-medium leading-5 text-foreground/65">
            {info.getValue<string>() || "Unassigned"}
          </span>
        ),
      },
      {
        accessorKey: "load",
        id: "load",
        header: "Load",
        size: 120,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<number>()}%
          </span>
        ),
      },
      {
        accessorKey: "openJobs",
        id: "openJobs",
        header: "Open Jobs",
        size: 130,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<number>().toLocaleString()}
          </span>
        ),
      },
      {
        id: "technicians",
        accessorFn: (row) =>
          `${row.technicianCount} ${row.clusterTechnicianCount} ${row.unmappedTechnicianCount}`,
        header: "Technicians",
        size: 170,
        cell: ({ row }) => (
          <div className="text-xs font-semibold text-foreground/65">
            <p>Total: {row.original.technicianCount}</p>
            <p className="mt-1">Cluster: {row.original.clusterTechnicianCount}</p>
            <p className="mt-1">Unmapped: {row.original.unmappedTechnicianCount}</p>
          </div>
        ),
      },
      {
        accessorKey: "terminalBuffer",
        id: "terminalBuffer",
        header: "Terminal Buffer",
        size: 160,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<number>().toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "sparePartBuffer",
        id: "sparePartBuffer",
        header: "Spare Parts",
        size: 140,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<number>().toLocaleString()}
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
            onClick={() => setSelectedServicePoint(row.original)}
            size="sm"
            aria-label={`Update ${row.original.name}`}
            data-testid={`update-service-point-${row.original.id}`}
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
  const onlineServicePoints = servicePoints.filter(
    (servicePoint) => servicePoint.status === "Online",
  ).length;
  const totalTerminalBuffer = servicePoints.reduce(
    (total, servicePoint) => total + servicePoint.terminalBuffer,
    0,
  );
  const totalSparePartBuffer = servicePoints.reduce(
    (total, servicePoint) => total + servicePoint.sparePartBuffer,
    0,
  );
  const openJobs = servicePoints.reduce(
    (total, servicePoint) => total + servicePoint.openJobs,
    0,
  );

  const createServicePoint = (servicePoint: ServicePoint) => {
    const id = getServicePointId(
      servicePoint.code,
      servicePoint.name,
      new Set(servicePoints.map((item) => item.id)),
    );

    setServicePoints((current) => [...current, { ...servicePoint, id }]);
    setCreateOpen(false);
  };

  const updateServicePoint = (servicePoint: ServicePoint) => {
    if (!selectedServicePoint) return;

    setServicePoints((current) =>
      current.map((item) =>
        item.id === selectedServicePoint.id
          ? { ...servicePoint, id: selectedServicePoint.id }
          : item,
      ),
    );
    setSelectedServicePoint(null);
  };

  return (
    <div
      className="animate-fade-up space-y-6"
      data-testid="service-points-page"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Asset Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Service Point Stock
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Control service point coverage, warehouse ownership, reorder levels,
            and inventory buffers from one operational workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile
            label="Service Points"
            value={servicePoints.length}
            icon={LuMapPin}
          />
          <MetricTile
            label="Online"
            value={onlineServicePoints}
            icon={LuWrench}
            tone="good"
          />
          <MetricTile
            label="Buffers"
            value={`${totalTerminalBuffer}/${totalSparePartBuffer}`}
            icon={LuPackage}
            tone={totalTerminalBuffer < 100 ? "warning" : "default"}
          />
          <MetricTile
            label="Open Jobs"
            value={openJobs}
            icon={LuUsers}
            tone={openJobs ? "warning" : "good"}
          />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuClipboardList className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Service Point List
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search service points</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search service point, warehouse, region..."
                className="pl-9"
                data-testid="service-point-search-input"
              />
            </label>

            <RowsPerPageDropdown
              value={table.getState().pagination.pageSize}
              onChange={(pageSize) => table.setPageSize(pageSize)}
            />
            <Button
              onClick={() => setCreateOpen(true)}
              data-testid="create-service-point-button"
            >
              <LuPlus className="h-4 w-4" strokeWidth={1.75} />
              Create Service Point
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
                    No service points match your search.
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
        <ServicePointDialog
          mode="create"
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={createServicePoint}
        />
      ) : null}

      {selectedServicePoint ? (
        <ServicePointDialog
          key={selectedServicePoint.id}
          mode="update"
          servicePoint={selectedServicePoint}
          open={Boolean(selectedServicePoint)}
          onClose={() => setSelectedServicePoint(null)}
          onSave={updateServicePoint}
        />
      ) : null}
    </div>
  );
}
