import { useEffect, useMemo, useRef, useState } from "react";
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
  LuChevronDown,
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
    <span
      className={`inline-flex min-w-20 items-center justify-center rounded-md px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ServicePointStatusBadge({ status }: { status: ServicePoint["status"] }) {
  const colorMap: Record<ServicePoint["status"], string> = {
    Online: "bg-emerald-100 text-emerald-700",
    Degraded: "bg-amber-100 text-amber-700",
    Offline: "bg-rose-100 text-rose-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${colorMap[status]}`}
    >
      {status}
    </span>
  );
}

function ServicePointCell({ servicePoint }: { servicePoint?: ServicePoint }) {
  if (!servicePoint) {
    return (
      <span className="inline-flex rounded-md bg-[#DDE0EC]/70 px-2 py-1 text-xs font-semibold text-[#0E2748]/60">
        Unassigned
      </span>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="truncate font-semibold text-[#0E2748]">
          {servicePoint.name}
        </span>
        <ServicePointStatusBadge status={servicePoint.status} />
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-[#0E2748]/55">
        <LuMapPin className="h-3 w-3 shrink-0 text-[#3F6FA8]" strokeWidth={1.75} />
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
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-[#DDE0EC] bg-white text-[#0E2748] transition-colors hover:bg-[#DDE0EC]/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function RowsPerPageDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 min-w-36 items-center gap-2 rounded-md border border-[#DDE0EC] bg-white px-3 text-sm text-[#0E2748] transition-colors hover:border-[#3F6FA8] hover:bg-[#DDE0EC]/20"
        data-testid="technician-page-size"
      >
        <LuSlidersHorizontal
          className="h-4 w-4 shrink-0 text-[#3F6FA8]"
          strokeWidth={1.75}
        />
        <span className="whitespace-nowrap text-xs font-medium text-[#0E2748]/60">
          Rows
        </span>
        <span className="ml-auto font-semibold text-[#0E2748]">{value}</span>
        <LuChevronDown
          className={`h-3.5 w-3.5 text-[#0E2748]/50 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-11 z-50 w-36 overflow-hidden rounded-lg border border-[#DDE0EC] bg-white p-1 shadow-xl"
        >
          {PAGE_SIZE_OPTIONS.map((pageSize) => {
            const active = pageSize === value;

            return (
              <button
                key={pageSize}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(pageSize);
                  setOpen(false);
                }}
                className={`flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#DDE0EC]/70 text-[#0E2748]"
                    : "text-[#0E2748]/80 hover:bg-[#DDE0EC]/40"
                }`}
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {active ? (
                    <LuCheck className="h-4 w-4 text-[#0E2748]" strokeWidth={2.5} />
                  ) : null}
                </span>
                {pageSize}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0E2748]/45 p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close manage service point"
        onClick={onClose}
      />
      <form
        className="relative flex max-h-[min(44rem,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#DDE0EC] bg-white shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="border-b border-[#DDE0EC] bg-[#F6F7F9] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8]">
                Manage Service Point
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#0E2748]">
                {technician.fullName}
              </h2>
              <p className="mt-1 text-sm text-[#0E2748]/60">
                @{technician.username} - {technician.department}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#DDE0EC] bg-white text-[#0E2748] transition-colors hover:bg-[#DDE0EC]/50"
            >
              <LuX className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          <label className="relative mb-4 block">
            <span className="sr-only">Search service points</span>
            <LuSearch
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F6FA8]"
              strokeWidth={1.75}
            />
            <input
              value={servicePointSearch}
              onChange={(event) => setServicePointSearch(event.target.value)}
              placeholder="Search service point, city, region, status..."
              className="h-10 w-full rounded-md border border-[#DDE0EC] bg-white pl-9 pr-3 text-sm text-[#0E2748] outline-none transition-colors placeholder:text-[#0E2748]/40 focus:border-[#3F6FA8]"
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
                      <button
                        key={servicePoint.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => field.handleChange(servicePoint.id)}
                        className={`w-full rounded-lg border p-4 text-left transition-colors ${
                          selected
                            ? "border-[#3F6FA8] bg-[#3F6FA8]/5"
                            : "border-[#DDE0EC] bg-white hover:border-[#3F6FA8]/60 hover:bg-[#F6F7F9]"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <span
                              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-[#3F6FA8] bg-[#3F6FA8] text-white"
                                  : "border-[#DDE0EC] bg-white"
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
                                <h3 className="font-semibold text-[#0E2748]">
                                  {servicePoint.name}
                                </h3>
                                <ServicePointStatusBadge
                                  status={servicePoint.status}
                                />
                                {current ? (
                                  <span className="rounded-md bg-[#0E2748] px-2 py-0.5 text-[11px] font-semibold text-white">
                                    Current
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-[#0E2748]/65">
                                {servicePoint.region} - {servicePoint.city}
                              </p>
                              <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-[#0E2748]/55">
                                <LuMapPin
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3F6FA8]"
                                  strokeWidth={1.75}
                                />
                                {servicePoint.address}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 sm:w-72">
                            <div className="rounded-md bg-[#F6F7F9] px-3 py-2">
                              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#0E2748]/45">
                                <LuActivity
                                  className="h-3 w-3 text-[#3F6FA8]"
                                  strokeWidth={1.75}
                                />
                                Load
                              </p>
                              <p className="mt-1 text-sm font-bold text-[#0E2748]">
                                {servicePoint.load}%
                              </p>
                            </div>
                            <div className="rounded-md bg-[#F6F7F9] px-3 py-2">
                              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#0E2748]/45">
                                <LuBriefcaseBusiness
                                  className="h-3 w-3 text-[#3F6FA8]"
                                  strokeWidth={1.75}
                                />
                                Jobs
                              </p>
                              <p className="mt-1 text-sm font-bold text-[#0E2748]">
                                {servicePoint.openJobs}
                              </p>
                            </div>
                            <div className="rounded-md bg-[#F6F7F9] px-3 py-2">
                              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#0E2748]/45">
                                <LuUsers
                                  className="h-3 w-3 text-[#3F6FA8]"
                                  strokeWidth={1.75}
                                />
                                Tech
                              </p>
                              <p className="mt-1 text-sm font-bold text-[#0E2748]">
                                {servicePoint.technicianCount}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-[#DDE0EC] bg-[#F6F7F9] px-4 py-10 text-center text-sm text-[#0E2748]/60">
                    No service points match your search.
                  </div>
                )}
              </div>
            )}
          </form.Field>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#DDE0EC] bg-white p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#DDE0EC] bg-white px-4 text-sm font-semibold text-[#0E2748] transition-colors hover:bg-[#DDE0EC]/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#0E2748] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3F6FA8]"
          >
            Save Service Point
          </button>
        </div>
      </form>
    </div>
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
          <span className="font-semibold text-[#0E2748]">
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
          <span className="font-medium text-[#0E2748]">
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
          <span className="whitespace-nowrap text-[#3F6FA8]">
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
          <button
            type="button"
            onClick={() => openManageServicePoint(row.original)}
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md bg-[#0E2748] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#3F6FA8]"
            aria-label={`Manage service point for ${row.original.fullName}`}
            data-testid={`manage-service-point-${row.original.username}`}
          >
            <LuMapPinned className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Manage Service Point
          </button>
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
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8]">
            Field Operations
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0E2748] md:text-4xl">
            Technician Directory
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#0E2748]/60">
            Manage technician contacts, active status, and service point
            assignments from one operational list.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="rounded-lg border border-[#DDE0EC] bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0E2748]/50">
              Technicians
            </p>
            <p className="mt-1 text-2xl font-bold text-[#0E2748]">
              {TECHNICIANS.length}
            </p>
          </div>
          <div className="rounded-lg border border-[#DDE0EC] bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0E2748]/50">
              Active
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {TECHNICIANS.filter((technician) => technician.active).length}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-[#DDE0EC] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#DDE0EC] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DDE0EC]/60 text-[#3F6FA8]">
              <LuUsers className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#0E2748]">
                User List
              </h2>
              <p className="text-xs text-[#0E2748]/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search technicians</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F6FA8]"
                strokeWidth={1.75}
              />
              <input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search username, email, department..."
                className="h-10 w-full rounded-md border border-[#DDE0EC] bg-white pl-9 pr-3 text-sm text-[#0E2748] outline-none transition-colors placeholder:text-[#0E2748]/40 focus:border-[#3F6FA8]"
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
          <table
            className="w-full border-separate border-spacing-0 text-left"
            style={{ minWidth: table.getTotalSize() }}
          >
            <thead className="bg-[#F6F7F9]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const pinnedStyles = getPinnedColumnStyles(header.column);

                    return (
                      <th
                        key={header.id}
                        className="border-b border-[#DDE0EC] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#0E2748]/60"
                        style={{ ...pinnedStyles, background: "#F6F7F9" }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[#DDE0EC]">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-[#F6F7F9]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-4 text-sm text-[#0E2748]/70"
                        style={getPinnedColumnStyles(cell.column)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-[#0E2748]/60"
                  >
                    No technicians match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#DDE0EC] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#0E2748]/60">
            Page{" "}
            <span className="font-semibold text-[#0E2748]">
              {pageCount ? currentPage : 0}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[#0E2748]">
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
                    className="flex h-9 w-9 items-center justify-center text-sm font-semibold text-[#0E2748]/40"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    aria-current={item === currentPage ? "page" : undefined}
                    onClick={() => table.setPageIndex(item - 1)}
                    className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors ${
                      item === currentPage
                        ? "border-[#0E2748] bg-[#0E2748] text-white"
                        : "border-[#DDE0EC] bg-white text-[#0E2748] hover:bg-[#DDE0EC]/40"
                    }`}
                  >
                    {item}
                  </button>
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
