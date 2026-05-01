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
  LuBox,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuEye,
  LuPackage,
  LuPackageCheck,
  LuPackageSearch,
  LuSearch,
  LuSlidersHorizontal,
  LuTags,
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
import { INVENTORY_ITEMS, PRODUCTS } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import type { Product, ProductCategory, ProductStatus } from "~/data/mockData";

type PaginationItem = number | "ellipsis";
type CategoryFilter = ProductCategory | "All";
type StatusFilter = ProductStatus | "All";
type ProductRow = Product & {
  totalStock: number;
  availableStock: number;
  exceptionStock: number;
  installedStock: number;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const categoryFilters: CategoryFilter[] = [
  "All",
  "Terminal",
  "Peripheral",
  "Spare Part",
];
const statusFilters: StatusFilter[] = ["All", "Active", "Phasing Out", "Inactive"];

export function meta() {
  return [
    { title: "Product List | EDC.OS" },
    {
      name: "description",
      content: "Product master list and stock summary workspace.",
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

function getPinnedColumnStyles(column: Column<ProductRow>): CSSProperties {
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
        data-testid="product-page-size"
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

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const variantMap: Record<
    ProductStatus,
    "success" | "warning" | "secondary"
  > = {
    Active: "success",
    "Phasing Out": "warning",
    Inactive: "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
      {status}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: ProductCategory }) {
  const variantMap: Record<ProductCategory, "default" | "outline" | "secondary"> = {
    Terminal: "default",
    Peripheral: "outline",
    "Spare Part": "secondary",
  };

  return <Badge variant={variantMap[category]}>{category}</Badge>;
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

function getProductRows(): ProductRow[] {
  return PRODUCTS.map((product) => {
    const stock = INVENTORY_ITEMS.filter((item) => item.productId === product.id);
    const availableStock = stock.filter(
      (item) => item.status === "Available / Stock Titipan",
    ).length;
    const exceptionStock = stock.filter(
      (item) => item.status === "Discrepancy" || item.status === "Quarantine",
    ).length;
    const installedStock = stock.filter((item) => item.status === "Installed").length;

    return {
      ...product,
      totalStock: stock.length,
      availableStock,
      exceptionStock,
      installedStock,
    };
  });
}

export default function ProductList() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });

  const productRows = useMemo(() => getProductRows(), []);
  const filteredProducts = useMemo(
    () =>
      productRows.filter((product) => {
        const matchesCategory =
          categoryFilter === "All" || product.category === categoryFilter;
        const matchesStatus =
          statusFilter === "All" || product.status === statusFilter;

        return matchesCategory && matchesStatus;
      }),
    [categoryFilter, productRows, statusFilter],
  );

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        id: "product",
        accessorFn: (row) => `${row.sku} ${row.name} ${row.brand} ${row.model}`,
        header: "Product",
        size: 300,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.name}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-accent">
              {row.original.sku}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.brand} - {row.original.model}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        id: "category",
        header: "Category",
        size: 140,
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        size: 150,
        cell: ({ row }) => <ProductStatusBadge status={row.original.status} />,
      },
      {
        id: "stock",
        accessorFn: (row) =>
          `${row.totalStock} ${row.availableStock} ${row.installedStock} ${row.exceptionStock}`,
        header: "Stock",
        size: 180,
        cell: ({ row }) => (
          <div className="text-xs font-semibold text-foreground/65">
            <p>Total: {row.original.totalStock}</p>
            <p className="mt-1">Available: {row.original.availableStock}</p>
          </div>
        ),
      },
      {
        accessorKey: "minStock",
        id: "minStock",
        header: "Min Stock",
        size: 130,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<number>().toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "warrantyMonths",
        id: "warrantyMonths",
        header: "Warranty",
        size: 130,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<number>()} mo
          </span>
        ),
      },
      {
        accessorKey: "description",
        id: "description",
        header: "Description",
        size: 360,
        cell: (info) => (
          <span className="line-clamp-2 text-xs leading-5 text-foreground/60">
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
          <Link
            to={`/app/products/detail/${row.original.id}`}
            className={buttonVariants({ size: "sm" })}
            data-testid={`view-product-${row.original.id}`}
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
    data: filteredProducts,
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
  const activeProducts = productRows.filter(
    (product) => product.status === "Active",
  ).length;
  const totalStock = productRows.reduce(
    (total, product) => total + product.totalStock,
    0,
  );
  const lowStockProducts = productRows.filter(
    (product) => product.availableStock < product.minStock,
  ).length;

  return (
    <div className="animate-fade-up space-y-6" data-testid="product-list-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Products
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Product List
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Manage product master visibility for terminals, peripherals, spare
            parts, warranty policy, and stock summary.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile label="Products" value={productRows.length} icon={LuPackage} />
          <MetricTile
            label="Active"
            value={activeProducts}
            icon={LuPackageCheck}
            tone="good"
          />
          <MetricTile label="SN Stock" value={totalStock} icon={LuBox} />
          <MetricTile
            label="Below Min"
            value={lowStockProducts}
            icon={LuTags}
            tone={lowStockProducts ? "warning" : "good"}
          />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuPackageSearch className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Product Master
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search products</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search SKU, product, brand..."
                className="pl-9"
                data-testid="product-search-input"
              />
            </label>
            <Select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value as CategoryFilter);
                table.setPageIndex(0);
              }}
              className="sm:w-40"
              data-testid="product-category-filter"
            >
              {categoryFilters.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All categories" : category}
                </option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                table.setPageIndex(0);
              }}
              className="sm:w-40"
              data-testid="product-status-filter"
            >
              {statusFilters.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All status" : status}
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
                    No products match your filters.
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
