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
  LuActivity,
  LuBriefcaseBusiness,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuCheck,
  LuMapPinned,
  LuMapPin,
  LuSearch,
  LuSlidersHorizontal,
  LuX,
  LuUsers,
} from "react-icons/lu";

import {
  SERVICE_POINTS,
  TECHNICIAN_SERVICE_POINT_ASSIGNMENTS,
  TECHNICIANS,
} from "~/data/mockData";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { ServicePoint, Technician } from "~/data/mockData";

type PaginationItem = number | "ellipsis";
const PAGE_SIZE_OPTIONS = [5, 10, 15];

export function meta() {
  return [
    { title: "Technician Directory | EDC.OS" },
    {
      name: "description",
      content:
        "Field technician directory and service point assignment workspace.",
    },
  ];
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant={active ? "success" : "destructive"}
      className="min-w-20 justify-center px-2.5 py-1"
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function ServicePointStatusBadge({ status }: { status: ServicePoint["status"] }) {
  const variantMap: Record<
    ServicePoint["status"],
    "success" | "warning" | "destructive"
  > = {
    Online: "success",
    Degraded: "warning",
    Offline: "destructive",
  };

  return (
    <Badge variant={variantMap[status]} className="text-[11px]">
      {status}
    </Badge>
  );
}

function ServicePointCell({ servicePoint }: { servicePoint?: ServicePoint }) {
  if (!servicePoint) {
    return (
      <Badge variant="secondary" className="px-2 py-1">
        Unassigned
      </Badge>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="truncate font-semibold text-foreground">
          {servicePoint.name}
        </span>
        <ServicePointStatusBadge status={servicePoint.status} />
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-foreground/55">
        <LuMapPin className="h-3 w-3 shrink-0 text-accent" strokeWidth={1.75} />
        <span className="truncate">
          {servicePoint.city} - {servicePoint.region}
        </span>
      </div>
    </div>
  );
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
        data-testid="technician-page-size"
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

function ManageServicePointModal({
  technician,
  servicePoints,
  currentServicePointId,
  onClose,
  onSave,
}: {
  technician: Technician;
  servicePoints: ServicePoint[];
  currentServicePointId?: string;
  onClose: () => void;
  onSave: (servicePointId: string) => void;
}) {
  const [servicePointSearch, setServicePointSearch] = useState("");
  const form = useForm({
    defaultValues: {
      servicePointId: currentServicePointId ?? servicePoints[0]?.id ?? "",
    },
    onSubmit: ({ value }) => {
      onSave(value.servicePointId);
    },
  });
  const filteredServicePoints = useMemo(() => {
    const keyword = servicePointSearch.trim().toLowerCase();

    if (!keyword) return servicePoints;

    return servicePoints.filter((servicePoint) =>
      [
        servicePoint.name,
        servicePoint.city,
        servicePoint.region,
        servicePoint.address,
        servicePoint.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [servicePointSearch, servicePoints]);

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
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
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                  Manage Service Point
                </p>
                <DialogTitle>{technician.fullName}</DialogTitle>
                <DialogDescription>
                  @{technician.username} - {technician.department}
                </DialogDescription>
              </div>
              <Button
                aria-label="Close"
                onClick={onClose}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                <LuX className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto p-5">
            <label className="relative mb-4 block">
              <span className="sr-only">Search service points</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={servicePointSearch}
                onChange={(event) => setServicePointSearch(event.target.value)}
                placeholder="Search service point, city, region, status..."
                className="pl-9"
                data-testid="service-point-search-input"
              />
            </label>

            <form.Field
              name="servicePointId"
              validators={{
                onChange: ({ value }) =>
                  value ? undefined : "Service point is required",
              }}
            >
              {(field) => (
                <div className="grid gap-3">
                  {filteredServicePoints.length ? (
                    filteredServicePoints.map((servicePoint) => {
                      const selected = field.state.value === servicePoint.id;
                      const current = currentServicePointId === servicePoint.id;

                      return (
                        <Button
                          key={servicePoint.id}
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.handleChange(servicePoint.id)}
                          variant="outline"
                          className={`h-auto w-full justify-start whitespace-normal rounded-lg p-4 text-left ${
                            selected
                              ? "border-accent bg-accent/5"
                              : "border-border bg-white hover:border-accent/60 hover:bg-background"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 gap-3">
                              <span
                                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  selected
                                    ? "border-accent bg-accent text-white"
                                    : "border-border bg-white"
                                }`}
                              >
                                {selected ? (
                                  <LuCheck
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2.5}
                                  />
                                ) : null}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-foreground">
                                    {servicePoint.name}
                                  </h3>
                                  <ServicePointStatusBadge
                                    status={servicePoint.status}
                                  />
                                  {current ? (
                                    <Badge className="text-[11px]">
                                      Current
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-sm text-foreground/65">
                                  {servicePoint.region} - {servicePoint.city}
                                </p>
                                <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-foreground/55">
                                  <LuMapPin
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
                                    strokeWidth={1.75}
                                  />
                                  {servicePoint.address}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:w-72">
                              <div className="rounded-md bg-background px-3 py-2">
                                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                                  <LuActivity
                                    className="h-3 w-3 text-accent"
                                    strokeWidth={1.75}
                                  />
                                  Load
                                </p>
                                <p className="mt-1 text-sm font-bold text-foreground">
                                  {servicePoint.load}%
                                </p>
                              </div>
                              <div className="rounded-md bg-background px-3 py-2">
                                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                                  <LuBriefcaseBusiness
                                    className="h-3 w-3 text-accent"
                                    strokeWidth={1.75}
                                  />
                                  Jobs
                                </p>
                                <p className="mt-1 text-sm font-bold text-foreground">
                                  {servicePoint.openJobs}
                                </p>
                              </div>
                              <div className="rounded-md bg-background px-3 py-2">
                                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                                  <LuUsers
                                    className="h-3 w-3 text-accent"
                                    strokeWidth={1.75}
                                  />
                                  Tech
                                </p>
                                <p className="mt-1 text-sm font-bold text-foreground">
                                  {servicePoint.technicianCount}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Button>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-foreground/60">
                      No service points match your search.
                    </div>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button type="submit">Save Service Point</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
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

function getPinnedColumnStyles(column: Column<Technician>): CSSProperties {
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

export default function TechnicianDirectory() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });
  const [assignedServicePointByUser, setAssignedServicePointByUser] = useState(
    TECHNICIAN_SERVICE_POINT_ASSIGNMENTS,
  );
  const [selectedTechnician, setSelectedTechnician] =
    useState<Technician | null>(null);

  const servicePointsById = useMemo(
    () =>
      Object.fromEntries(
        SERVICE_POINTS.map((servicePoint) => [servicePoint.id, servicePoint]),
      ) as Record<string, ServicePoint>,
    [],
  );

  const openManageServicePoint = (technician: Technician) => {
    setSelectedTechnician(technician);
  };

  const closeManageServicePoint = () => {
    setSelectedTechnician(null);
  };

  const saveServicePoint = (servicePointId: string) => {
    if (!selectedTechnician || !servicePointId) return;

    setAssignedServicePointByUser((current) => ({
      ...current,
      [selectedTechnician.username]: servicePointId,
    }));
    closeManageServicePoint();
  };

  const columns = useMemo<ColumnDef<Technician>[]>(
    () => [
      {
        accessorKey: "username",
        id: "username",
        header: "Username",
        size: 150,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            @{info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "fullName",
        id: "fullName",
        header: "Full Name",
        size: 190,
        cell: (info) => (
          <span className="font-medium text-foreground">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "phone",
        id: "phone",
        header: "Phone",
        size: 170,
      },
      {
        accessorKey: "email",
        id: "email",
        header: "Email",
        size: 240,
        cell: (info) => (
          <span className="whitespace-nowrap text-accent">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "department",
        id: "department",
        header: "Department",
        size: 220,
      },
      {
        id: "servicePoint",
        accessorFn: (row) =>
          servicePointsById[assignedServicePointByUser[row.username]]?.name ??
          "Unassigned",
        header: "Service Point",
        size: 260,
        cell: ({ row }) => (
          <ServicePointCell
            servicePoint={
              servicePointsById[assignedServicePointByUser[row.original.username]]
            }
          />
        ),
      },
      {
        id: "status",
        accessorFn: (row) => (row.active ? "Active" : "Inactive"),
        header: "Status",
        size: 130,
        cell: ({ row }) => <StatusBadge active={row.original.active} />,
      },
      {
        id: "actions",
        header: "Action",
        size: 220,
        enableGlobalFilter: false,
        enablePinning: true,
        cell: ({ row }) => (
          <Button
            onClick={() => openManageServicePoint(row.original)}
            size="sm"
            aria-label={`Manage service point for ${row.original.fullName}`}
            data-testid={`manage-service-point-${row.original.username}`}
          >
            <LuMapPinned className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Manage Service Point
          </Button>
        ),
      },
    ],
    [assignedServicePointByUser, servicePointsById],
  );

  const table = useReactTable({
    data: TECHNICIANS,
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

  return (
    <div
      className="animate-fade-up space-y-6"
      data-testid="technician-directory-page"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Field Operations
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Technician Directory
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Manage technician contacts, active status, and service point
            assignments from one operational list.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="rounded-lg border border-border bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
              Technicians
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {TECHNICIANS.length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
              Active
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {TECHNICIANS.filter((technician) => technician.active).length}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuUsers className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                User List
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search technicians</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search username, email, department..."
                className="pl-9"
                data-testid="technician-search-input"
              />
            </label>

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
                    No technicians match your search.
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

      {selectedTechnician ? (
        <ManageServicePointModal
          key={selectedTechnician.username}
          technician={selectedTechnician}
          servicePoints={SERVICE_POINTS}
          currentServicePointId={
            assignedServicePointByUser[selectedTechnician.username]
          }
          onClose={closeManageServicePoint}
          onSave={saveServicePoint}
        />
      ) : null}
    </div>
  );
}
