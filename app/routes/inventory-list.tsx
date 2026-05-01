import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  LuBarcode,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuEye,
  LuPackageCheck,
  LuPackageSearch,
  LuSearch,
  LuShieldAlert,
  LuSlidersHorizontal,
  LuWarehouse,
} from "react-icons/lu";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
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
import { INVENTORY_ITEMS, PRODUCTS, WAREHOUSES } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import type {
  InventoryCondition,
  InventoryItem,
  InventoryItemStatus,
  Product,
  Warehouse,
} from "~/data/mockData";

type PaginationItem = number | "ellipsis";
type StatusFilter = InventoryItemStatus | "All" | "Exception";
type WarehouseFilter = string | "All";
type ProductFilter = string | "All";
type InventoryRow = InventoryItem & {
  productName: string;
  productSku: string;
  productCategory: Product["category"];
  productTrackingType: Product["trackingType"];
  warehouseCode: string;
  warehouseName: string;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const statusFilters: StatusFilter[] = [
  "All",
  "Available / Stock Titipan",
  "Reserved",
  "Picked / Packed",
  "In Delivery",
  "Installed",
  "Returned",
  "Exception",
  "Quarantine",
  "Discrepancy",
  "In Repair",
  "Retired",
];
const quickFilters: { label: string; value: StatusFilter }[] = [
  { label: "Available", value: "Available / Stock Titipan" },
  { label: "Reserved", value: "Reserved" },
  { label: "In Delivery", value: "In Delivery" },
  { label: "Installed", value: "Installed" },
  { label: "Exception", value: "Exception" },
  { label: "Repair", value: "In Repair" },
  { label: "Retired", value: "Retired" },
];

export function meta() {
  return [
    { title: "Asset Registry | EDC.OS" },
    {
      name: "description",
      content: "Asset registry workspace for serialized, batch, and quantity-tracked stock.",
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

function getPinnedColumnStyles(column: Column<InventoryRow>): CSSProperties {
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

function mapById<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
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
        data-testid="inventory-page-size"
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

function StatusBadge({ status }: { status: InventoryItemStatus }) {
  const variantMap: Record<
    InventoryItemStatus,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  > = {
    "Available / Stock Titipan": "success",
    Reserved: "default",
    "Picked / Packed": "default",
    "In Delivery": "default",
    Installed: "outline",
    Returned: "secondary",
    Quarantine: "destructive",
    Discrepancy: "warning",
    "In Repair": "warning",
    Retired: "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
      {status}
    </Badge>
  );
}

function ConditionBadge({ condition }: { condition: InventoryCondition }) {
  const variantMap: Record<
    InventoryCondition,
    "success" | "warning" | "destructive" | "secondary"
  > = {
    New: "success",
    Good: "success",
    "Needs QC": "warning",
    Damaged: "destructive",
  };

  return <Badge variant={variantMap[condition]}>{condition}</Badge>;
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

export default function InventoryList() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [warehouseFilter, setWarehouseFilter] = useState<WarehouseFilter>("All");
  const [productFilter, setProductFilter] = useState<ProductFilter>("All");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });

  const productById = useMemo(() => mapById<Product>(PRODUCTS), []);
  const warehouseById = useMemo(() => mapById<Warehouse>(WAREHOUSES), []);
  const inventoryRows = useMemo<InventoryRow[]>(
    () =>
      INVENTORY_ITEMS.map((item) => {
        const product = productById[item.productId];
        const warehouse = warehouseById[item.warehouseId];

        return {
          ...item,
          productName: product?.name ?? "Unknown product",
          productSku: product?.sku ?? "Unknown SKU",
          productCategory: product?.category ?? "Terminal",
          productTrackingType: product?.trackingType ?? "Serialized",
          warehouseCode: warehouse?.code ?? "Unassigned",
          warehouseName: warehouse?.name ?? "Unassigned warehouse",
        };
      }),
    [productById, warehouseById],
  );

  const filteredInventory = useMemo(
    () =>
      inventoryRows.filter((item) => {
        const matchesStatus =
          statusFilter === "All" ||
          item.status === statusFilter ||
          (statusFilter === "Exception" &&
            (item.status === "Discrepancy" || item.status === "Quarantine"));
        const matchesWarehouse =
          warehouseFilter === "All" || item.warehouseId === warehouseFilter;
        const matchesProduct =
          productFilter === "All" || item.productId === productFilter;

        return matchesStatus && matchesWarehouse && matchesProduct;
      }),
    [inventoryRows, productFilter, statusFilter, warehouseFilter],
  );

  const columns = useMemo<ColumnDef<InventoryRow>[]>(
    () => [
      {
        id: "serial",
        accessorFn: (row) =>
          `${row.serialNumber} ${row.productName} ${row.productSku}`,
        header: "Serial Number",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.serialNumber}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-accent">
              {row.original.productSku}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.productName}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        size: 190,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "tracking",
        accessorFn: (row) => `${row.productTrackingType} ${row.stockQuantity ?? 1}`,
        header: "Tracking",
        size: 150,
        cell: ({ row }) => (
          <div className="min-w-0">
            <Badge variant="secondary">{row.original.productTrackingType}</Badge>
            <p className="mt-1 text-xs text-foreground/55">
              Qty {row.original.stockQuantity ?? 1}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "condition",
        id: "condition",
        header: "Condition",
        size: 130,
        cell: ({ row }) => <ConditionBadge condition={row.original.condition} />,
      },
      {
        id: "warehouse",
        accessorFn: (row) => `${row.warehouseCode} ${row.warehouseName}`,
        header: "Warehouse",
        size: 250,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.warehouseName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.warehouseCode} - {row.original.binLocation}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "ownerClient",
        id: "ownerClient",
        header: "Owner Client",
        size: 220,
        cell: (info) => (
          <span className="font-medium text-foreground">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "receivedAt",
        id: "receivedAt",
        header: "Received",
        size: 150,
      },
      {
        accessorKey: "lastMovementAt",
        id: "lastMovementAt",
        header: "Last Movement",
        size: 160,
      },
      {
        accessorKey: "firmwareVersion",
        id: "firmwareVersion",
        header: "Firmware",
        size: 140,
        cell: (info) => (
          <span className="text-xs font-semibold text-foreground/65">
            {info.getValue<string>() ?? "N/A"}
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
          <Link
            to={`/app/inventory/detail/${encodeURIComponent(
              row.original.serialNumber,
            )}`}
            className={buttonVariants({ size: "sm" })}
            data-testid={`view-inventory-${row.original.id}`}
          >
            <LuEye className="h-3.5 w-3.5" strokeWidth={1.75} />
            View
          </Link>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredInventory,
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
  const availableCount = inventoryRows.filter(
    (item) => item.status === "Available / Stock Titipan",
  ).length;
  const exceptionCount = inventoryRows.filter(
    (item) => item.status === "Discrepancy" || item.status === "Quarantine",
  ).length;
  const installedCount = inventoryRows.filter(
    (item) => item.status === "Installed",
  ).length;

  return (
    <div className="animate-fade-up space-y-6" data-testid="inventory-list-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Asset Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Asset Registry
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Track serialized devices, batch-managed peripherals, and quantity
            supplies across ownership, location, QC state, and lifecycle status.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile label="SN Records" value={inventoryRows.length} icon={LuBarcode} />
          <MetricTile
            label="Available"
            value={availableCount}
            icon={LuPackageCheck}
            tone="good"
          />
          <MetricTile
            label="Installed"
            value={installedCount}
            icon={LuWarehouse}
          />
          <MetricTile
            label="Exceptions"
            value={exceptionCount}
            icon={LuShieldAlert}
            tone={exceptionCount ? "danger" : "good"}
          />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuPackageSearch className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Asset Registry
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            <label className="relative block min-w-0 sm:w-72">
              <span className="sr-only">Search inventory</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search asset, SKU, client..."
                className="pl-9"
                data-testid="inventory-search-input"
              />
            </label>
            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                table.setPageIndex(0);
              }}
              className="sm:w-48"
              data-testid="inventory-status-filter"
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
              className="sm:w-52"
              data-testid="inventory-warehouse-filter"
            >
              <option value="All">All warehouses</option>
              {WAREHOUSES.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </Select>
            <Select
              value={productFilter}
              onChange={(event) => {
                setProductFilter(event.target.value as ProductFilter);
                table.setPageIndex(0);
              }}
              className="sm:w-52"
              data-testid="inventory-product-filter"
            >
              <option value="All">All products</option>
              {PRODUCTS.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </Select>
            <RowsPerPageDropdown
              value={table.getState().pagination.pageSize}
              onChange={(pageSize) => table.setPageSize(pageSize)}
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
          {quickFilters.map((filter) => (
            <Button
              key={filter.value}
              onClick={() => {
                setStatusFilter(filter.value);
                table.setPageIndex(0);
              }}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              className="shrink-0"
            >
              {filter.label}
            </Button>
          ))}
          {statusFilter !== "All" ? (
            <Button
              onClick={() => {
                setStatusFilter("All");
                table.setPageIndex(0);
              }}
              variant="ghost"
              size="sm"
              className="shrink-0"
            >
              Clear
            </Button>
          ) : null}
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
                    No asset records match your filters.
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
    </div>
  );
}
